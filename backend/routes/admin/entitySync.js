/**
 * Admin Entity Sync Routes
 * API endpoints for managing PP entity synchronization
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../../middleware/auth');
const autoSyncService = require('../../services/autoSyncService');
const entityExtractionService = require('../../services/entityExtractionService');
const { transformToCamelCase } = require('../../utils/caseTransform');
const AuditService = require('../../services/audit');

const router = express.Router();

/**
 * POST /api/admin/entity-sync/exchange/:id
 * Sync entities for a specific exchange
 */
router.post('/exchange/:id', [
  param('id').isUUID().withMessage('Exchange ID must be valid'),
  authenticateToken,
  requireRole(['admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const exchangeId = req.params.id;
    console.log(`🔄 Manual entity sync triggered for exchange: ${exchangeId}`);

    // Log the action
    await AuditService.log({
      action: 'ENTITY_SYNC_TRIGGERED',
      entityType: 'exchange',
      entityId: exchangeId,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        sync_type: 'manual',
        triggered_by: req.user.email
      }
    });

    // Perform sync
    const result = await autoSyncService.syncExchangeEntities(exchangeId);

    if (result.success) {
      res.json({
        success: true,
        message: 'Entity sync completed successfully',
        results: result.results
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Entity sync failed',
        message: result.error
      });
    }

  } catch (error) {
    console.error('❌ Entity sync API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/entity-sync/all
 * Sync entities for all exchanges (bulk operation)
 */
router.post('/all', [
  authenticateToken,
  requireRole(['admin']),
  body('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  body('skip_completed').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { limit = 10, skip_completed = true } = req.body;
    
    console.log(`🔄 Bulk entity sync triggered by ${req.user.email}`);

    // Log the action
    await AuditService.log({
      action: 'BULK_ENTITY_SYNC_TRIGGERED',
      entityType: 'system',
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        sync_type: 'bulk',
        limit,
        skip_completed,
        triggered_by: req.user.email
      }
    });

    // Get exchanges to sync
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    let query = supabase
      .from('exchanges')
      .select('id, name, pp_matter_id, entities_sync_status')
      .eq('is_active', true)
      .not('pp_data', 'is', null)
      .limit(limit);

    if (skip_completed) {
      query = query.neq('entities_sync_status', 'completed');
    }

    const { data: exchanges, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch exchanges: ${error.message}`);
    }

    console.log(`📊 Found ${exchanges.length} exchanges to sync`);

    // Process each exchange
    const results = {
      total_exchanges: exchanges.length,
      successful: 0,
      failed: 0,
      skipped: 0,
      details: []
    };

    for (const exchange of exchanges) {
      try {
        console.log(`⏳ Syncing exchange: ${exchange.name}`);
        
        const syncResult = await autoSyncService.syncExchangeEntities(exchange.id);
        
        if (syncResult.success) {
          results.successful++;
          results.details.push({
            exchange_id: exchange.id,
            exchange_name: exchange.name,
            status: 'success',
            results: syncResult.results
          });
        } else {
          results.failed++;
          results.details.push({
            exchange_id: exchange.id,
            exchange_name: exchange.name,
            status: 'failed',
            error: syncResult.error
          });
        }
      } catch (error) {
        console.error(`❌ Failed to sync exchange ${exchange.id}:`, error);
        results.failed++;
        results.details.push({
          exchange_id: exchange.id,
          exchange_name: exchange.name,
          status: 'failed',
          error: error.message
        });
      }

      // Add small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Bulk sync completed: ${results.successful} successful, ${results.failed} failed`);

    res.json({
      success: true,
      message: `Bulk entity sync completed`,
      results
    });

  } catch (error) {
    console.error('❌ Bulk entity sync error:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk sync failed',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/entity-sync/preview/:id
 * Preview what entities would be extracted from an exchange
 */
router.get('/preview/:id', [
  param('id').isUUID().withMessage('Exchange ID must be valid'),
  authenticateToken,
  requireRole(['admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const exchangeId = req.params.id;

    // Get exchange data
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    const { data: exchange, error } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    if (error || !exchange) {
      return res.status(404).json({
        success: false,
        error: 'Exchange not found'
      });
    }

    // Extract entities (preview only)
    const entities = entityExtractionService.extractEntitiesFromExchange(exchange);
    const statistics = entityExtractionService.getExtractionStatistics(entities);

    // Check what entities already exist
    const existingChecks = await Promise.all(
      entities.map(async (entity) => {
        let existing = null;
        
        if (entity.type === 'user') {
          const { data: users } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .or(`pp_user_id.eq.${entity.pp_user_id},email.eq.${entity.email}`)
            .limit(1);
          existing = users && users.length > 0 ? users[0] : null;
        } else {
          // Check contacts
          const conditions = [];
          if (entity.pp_contact_id) conditions.push(`pp_contact_id.eq.${entity.pp_contact_id}`);
          if (entity.email) conditions.push(`email.eq.${entity.email}`);
          
          if (conditions.length > 0) {
            const { data: contacts } = await supabase
              .from('contacts')
              .select('id, first_name, last_name, company, email')
              .or(conditions.join(','))
              .limit(1);
            existing = contacts && contacts.length > 0 ? contacts[0] : null;
          }
        }
        
        return {
          ...entity,
          existing_entity: existing,
          will_create: !existing,
          will_update: !!existing
        };
      })
    );

    res.json({
      success: true,
      exchange: {
        id: exchange.id,
        name: exchange.name,
        pp_matter_id: exchange.pp_matter_id,
        entities_sync_status: exchange.entities_sync_status,
        entities_synced_at: exchange.entities_synced_at
      },
      preview: {
        entities: existingChecks,
        statistics: {
          ...statistics,
          will_create: existingChecks.filter(e => e.will_create).length,
          will_update: existingChecks.filter(e => e.will_update).length
        }
      }
    });

  } catch (error) {
    console.error('❌ Entity preview error:', error);
    res.status(500).json({
      success: false,
      error: 'Preview failed',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/entity-sync/status
 * Get overall sync status and statistics
 */
router.get('/status', [
  authenticateToken,
  requireRole(['admin'])
], async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // Get sync statistics from view
    const { data: stats } = await supabase
      .from('entity_sync_statistics')
      .select('*')
      .single();

    // Get recent sync logs
    const { data: recentLogs } = await supabase
      .from('entity_sync_logs')
      .select(`
        id, exchange_id, sync_type, entities_found,
        users_created, contacts_created, participants_added,
        sync_status, started_at, completed_at,
        exchanges(name, pp_matter_id)
      `)
      .order('started_at', { ascending: false })
      .limit(10);

    // Get exchanges needing sync
    const { data: needsSync } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_id, entities_sync_status, entities_synced_at')
      .eq('is_active', true)
      .not('pp_data', 'is', null)
      .or('entities_sync_status.is.null,entities_sync_status.eq.pending,entities_sync_status.eq.failed')
      .limit(20);

    res.json(transformToCamelCase({
      success: true,
      statistics: stats || {
        total_exchanges: 0,
        synced_exchanges: 0,
        failed_syncs: 0,
        pending_syncs: 0,
        last_sync_time: null,
        avg_sync_duration_seconds: null
      },
      recent_sync_logs: recentLogs || [],
      exchanges_needing_sync: needsSync || []
    }));

  } catch (error) {
    console.error('❌ Sync status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync status',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/entity-sync/logs
 * Get sync logs with pagination
 */
router.get('/logs', [
  authenticateToken,
  requireRole(['admin']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('status').optional().isIn(['running', 'completed', 'failed'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { page = 1, limit = 25, status } = req.query;
    const offset = (page - 1) * limit;

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    let query = supabase
      .from('entity_sync_logs')
      .select(`
        *, 
        exchanges(name, pp_matter_id),
        created_by_user:created_by(first_name, last_name, email)
      `)
      .order('started_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('sync_status', status);
    }

    const { data: logs, error, count } = await query;

    if (error) throw error;

    res.json(transformToCamelCase({
      success: true,
      logs: logs || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }));

  } catch (error) {
    console.error('❌ Sync logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get sync logs',
      message: error.message
    });
  }
});

module.exports = router;