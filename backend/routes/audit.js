const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const AuditService = require('../services/audit');
const supabaseService = require('../services/supabase');

const router = express.Router();

/**
 * GET /api/audit/logs
 * Get audit logs with role-based filtering
 * 
 * Role Access:
 * - Admin: See all audit logs
 * - Coordinator: See logs for exchanges they manage + their own actions
 * - Agency: See logs for their clients' exchanges + their own actions
 * - Client: See only their own logs
 * - Third Party: See only their own logs
 */
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      userId, 
      action, 
      entityType, 
      entityId, 
      startDate, 
      endDate,
      search 
    } = req.query;

    console.log(`📝 AUDIT LOGS: ${req.user.role} user ${req.user.email} requesting logs`);

    let filters = {};

    // Apply role-based filtering
    switch (req.user.role) {
      case 'admin':
        // Admin sees everything - no additional filters
        console.log('   ✓ Admin access - no filters applied');
        break;

      case 'coordinator':
        // Coordinator sees their own actions + actions on exchanges they manage
        console.log('   ✓ Coordinator filter - own actions + managed exchanges');
        
        // Get exchanges managed by this coordinator
        const { data: managedExchanges } = await supabaseService.client
          .from('exchanges')
          .select('id')
          .eq('coordinator_id', req.user.id);
        
        const managedExchangeIds = managedExchanges?.map(e => e.id) || [];
        
        filters = {
          $or: [
            { userId: req.user.id }, // Own actions
            { 
              entityType: 'exchange',
              entityId: { $in: managedExchangeIds }
            } // Actions on managed exchanges
          ]
        };
        break;

      case 'agency':
        // Agency sees their own actions + actions on their clients' exchanges
        console.log('   ✓ Agency filter - own actions + client exchanges');
        
        // Get clients associated with this agency
        const { data: agencyClients } = await supabaseService.client
          .from('contacts')
          .select('id')
          .eq('agency_id', req.user.id);
        
        const clientIds = agencyClients?.map(c => c.id) || [];
        
        // Get exchanges for these clients
        const { data: clientExchanges } = await supabaseService.client
          .from('exchanges')
          .select('id')
          .in('client_id', clientIds);
        
        const clientExchangeIds = clientExchanges?.map(e => e.id) || [];
        
        filters = {
          $or: [
            { userId: req.user.id }, // Own actions
            { 
              entityType: 'exchange',
              entityId: { $in: clientExchangeIds }
            } // Actions on client exchanges
          ]
        };
        break;

      case 'client':
      case 'third_party':
        // Clients and third parties only see their own actions
        console.log(`   ✓ ${req.user.role} filter - own actions only`);
        filters = { userId: req.user.id };
        break;

      default:
        console.log('   ⚠️ Unknown role - no access');
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Your role does not have access to audit logs'
        });
    }

    // Apply additional filters from query parameters
    if (userId && req.user.role === 'admin') {
      filters.userId = userId;
    }
    if (action) {
      filters.action = action;
    }
    if (entityType) {
      filters.entityType = entityType;
    }
    if (entityId) {
      filters.entityId = entityId;
    }
    if (startDate) {
      filters.created_at = { $gte: new Date(startDate) };
    }
    if (endDate) {
      if (filters.created_at) {
        filters.created_at.$lte = new Date(endDate);
      } else {
        filters.created_at = { $lte: new Date(endDate) };
      }
    }

    // Get audit logs with role-based filtering
    const auditLogs = await AuditService.getAuditLogs({
      ...filters,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // Apply search filter if provided
    let filteredLogs = auditLogs;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredLogs = auditLogs.filter(log => 
        log.action?.toLowerCase().includes(searchLower) ||
        log.entity_type?.toLowerCase().includes(searchLower) ||
        log.details?.message?.toLowerCase().includes(searchLower) ||
        log.users?.email?.toLowerCase().includes(searchLower) ||
        log.users?.first_name?.toLowerCase().includes(searchLower) ||
        log.users?.last_name?.toLowerCase().includes(searchLower)
      );
    }

    // Log this audit log access
    await AuditService.log({
      action: 'AUDIT_LOGS_VIEWED',
      userId: req.user.id,
      entityType: 'audit_logs',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        filters: Object.keys(filters),
        resultCount: filteredLogs.length,
        userRole: req.user.role
      }
    });

    res.json({
      success: true,
      data: filteredLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredLogs.length,
        totalPages: Math.ceil(filteredLogs.length / parseInt(limit))
      },
      filters: {
        applied: Object.keys(filters),
        userRole: req.user.role
      }
    });

  } catch (error) {
    console.error('❌ Error fetching audit logs:', error);
    res.status(500).json({
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/stats
 * Get audit statistics with role-based filtering
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    console.log(`📊 AUDIT STATS: ${req.user.role} user ${req.user.email} requesting stats`);

    let filters = {};

    // Apply role-based filtering for stats
    switch (req.user.role) {
      case 'admin':
        // Admin sees all stats
        break;

      case 'coordinator':
        // Coordinator sees stats for their managed exchanges
        const { data: managedExchanges } = await supabaseService.client
          .from('exchanges')
          .select('id')
          .eq('coordinator_id', req.user.id);
        
        const managedExchangeIds = managedExchanges?.map(e => e.id) || [];
        
        filters = {
          $or: [
            { userId: req.user.id },
            { 
              entityType: 'exchange',
              entityId: { $in: managedExchangeIds }
            }
          ]
        };
        break;

      case 'agency':
        // Agency sees stats for their clients' exchanges
        const { data: agencyClients } = await supabaseService.client
          .from('contacts')
          .select('id')
          .eq('agency_id', req.user.id);
        
        const clientIds = agencyClients?.map(c => c.id) || [];
        
        const { data: clientExchanges } = await supabaseService.client
          .from('exchanges')
          .select('id')
          .in('client_id', clientIds);
        
        const clientExchangeIds = clientExchanges?.map(e => e.id) || [];
        
        filters = {
          $or: [
            { userId: req.user.id },
            { 
              entityType: 'exchange',
              entityId: { $in: clientExchangeIds }
            }
          ]
        };
        break;

      case 'client':
      case 'third_party':
        // Clients and third parties only see their own stats
        filters = { userId: req.user.id };
        break;

      default:
        return res.status(403).json({
          error: 'Insufficient permissions',
          message: 'Your role does not have access to audit statistics'
        });
    }

    // Apply date filters
    if (startDate) {
      filters.startDate = startDate;
    }
    if (endDate) {
      filters.endDate = endDate;
    }

    const stats = await AuditService.getAuditStats(filters);

    // Log this stats access
    await AuditService.log({
      action: 'AUDIT_STATS_VIEWED',
      userId: req.user.id,
      entityType: 'audit_stats',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        filters: Object.keys(filters),
        userRole: req.user.role
      }
    });

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching audit stats:', error);
    res.status(500).json({
      error: 'Failed to fetch audit statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/actions
 * Get list of available audit actions for filtering
 */
router.get('/actions', authenticateToken, async (req, res) => {
  try {
    console.log(`📝 AUDIT ACTIONS: ${req.user.role} user requesting available actions`);

    // Get unique actions from audit logs
    const { data: actions, error } = await supabaseService.client
      .from('audit_logs')
      .select('action')
      .order('action');

    if (error) {
      console.error('❌ Error fetching audit actions:', error);
      return res.status(500).json({
        error: 'Failed to fetch audit actions',
        message: error.message
      });
    }

    // Get unique actions
    const uniqueActions = [...new Set(actions.map(a => a.action))];

    res.json({
      success: true,
      data: uniqueActions
    });

  } catch (error) {
    console.error('❌ Error fetching audit actions:', error);
    res.status(500).json({
      error: 'Failed to fetch audit actions',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/entity-types
 * Get list of available entity types for filtering
 */
router.get('/entity-types', authenticateToken, async (req, res) => {
  try {
    console.log(`📝 AUDIT ENTITY TYPES: ${req.user.role} user requesting available entity types`);

    // Get unique entity types from audit logs
    const { data: entityTypes, error } = await supabaseService.client
      .from('audit_logs')
      .select('entity_type')
      .not('entity_type', 'is', null)
      .order('entity_type');

    if (error) {
      console.error('❌ Error fetching entity types:', error);
      return res.status(500).json({
        error: 'Failed to fetch entity types',
        message: error.message
      });
    }

    // Get unique entity types
    const uniqueEntityTypes = [...new Set(entityTypes.map(e => e.entity_type))];

    res.json({
      success: true,
      data: uniqueEntityTypes
    });

  } catch (error) {
    console.error('❌ Error fetching entity types:', error);
    res.status(500).json({
      error: 'Failed to fetch entity types',
      message: error.message
    });
  }
});

/**
 * POST /api/audit/export
 * Export audit logs to CSV/JSON (admin only)
 */
router.post('/export', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { format = 'json', filters = {} } = req.body;

    console.log(`📤 AUDIT EXPORT: Admin ${req.user.email} exporting logs in ${format} format`);

    // Get all audit logs (no pagination for export)
    const auditLogs = await AuditService.getAuditLogs({
      ...filters,
      limit: 10000 // Large limit for export
    });

    let exportData;
    let contentType;
    let filename;

    if (format === 'csv') {
      // Convert to CSV
      const csvHeaders = ['Date', 'User', 'Action', 'Entity Type', 'Entity ID', 'IP Address', 'Details'];
      const csvRows = auditLogs.map(log => [
        new Date(log.created_at).toISOString(),
        log.users?.email || 'Unknown',
        log.action,
        log.entity_type || '',
        log.entity_id || '',
        log.ip_address || '',
        JSON.stringify(log.details || {})
      ]);

      exportData = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      contentType = 'text/csv';
      filename = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      // JSON format
      exportData = JSON.stringify(auditLogs, null, 2);
      contentType = 'application/json';
      filename = `audit_logs_${new Date().toISOString().split('T')[0]}.json`;
    }

    // Log this export
    await AuditService.log({
      action: 'AUDIT_LOGS_EXPORTED',
      userId: req.user.id,
      entityType: 'audit_logs',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        format,
        recordCount: auditLogs.length,
        filters
      }
    });

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(exportData);

  } catch (error) {
    console.error('❌ Error exporting audit logs:', error);
    res.status(500).json({
      error: 'Failed to export audit logs',
      message: error.message
    });
  }
});

module.exports = router;

