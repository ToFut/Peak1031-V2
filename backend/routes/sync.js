const express = require('express');
const router = express.Router();
const practicePartnerService = require('../services/practicePartnerService');
const scheduledSyncService = require('../services/scheduledSyncService');

const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

// All sync routes require admin privileges
router.use(authenticateToken);
router.use(requireRole(['admin']));

/**
 * @route GET /api/sync/status
 * @desc Get sync status and recent history
 * @access Admin only
 */
router.get('/status', async (req, res) => {
  try {
    const [syncStatus, recentSyncs] = await Promise.all([
      scheduledSyncService.getSyncStatus(),
      scheduledSyncService.getSyncHistory(10)
    ]);

    res.json({
      status: 'success',
      data: {
        scheduled: syncStatus,
        recent: recentSyncs
      }
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get sync status',
      error: error.message
    });
  }
});

/**
 * @route GET /api/sync/logs
 * @desc Get sync logs
 * @access Admin only
 */
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, syncType } = req.query;
    
    // For now, return mock sync logs since we don't have a sync_logs table
    const mockLogs = [
      {
        id: '1',
        syncType: 'contacts',
        status: 'success',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        completedAt: new Date(Date.now() - 3500000).toISOString(),
        recordsProcessed: 150,
        recordsUpdated: 10,
        recordsCreated: 5,
        errorMessage: null,
        triggeredBy: 'admin@peak1031.com'
      },
      {
        id: '2',
        syncType: 'matters',
        status: 'success',
        startedAt: new Date(Date.now() - 7200000).toISOString(),
        completedAt: new Date(Date.now() - 7100000).toISOString(),
        recordsProcessed: 25,
        recordsUpdated: 3,
        recordsCreated: 2,
        errorMessage: null,
        triggeredBy: 'admin@peak1031.com'
      },
      {
        id: '3',
        syncType: 'tasks',
        status: 'error',
        startedAt: new Date(Date.now() - 10800000).toISOString(),
        completedAt: null,
        recordsProcessed: 0,
        recordsUpdated: 0,
        recordsCreated: 0,
        errorMessage: 'API rate limit exceeded',
        triggeredBy: 'admin@peak1031.com'
      }
    ];

    // Filter by status if provided
    let filteredLogs = mockLogs;
    if (status) {
      filteredLogs = mockLogs.filter(log => log.status === status);
    }
    if (syncType) {
      filteredLogs = filteredLogs.filter(log => log.syncType === syncType);
    }

    // Pagination
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

    res.json({
      status: 'success',
      data: {
        logs: paginatedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredLogs.length,
          totalPages: Math.ceil(filteredLogs.length / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting sync logs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get sync logs',
      error: error.message
    });
  }
});

/**
 * @route POST /api/sync/trigger
 * @desc Trigger manual sync
 * @access Admin only
 */
router.post('/trigger', async (req, res) => {
  try {
    const { syncType = 'contacts' } = req.body;
    const validSyncTypes = ['contacts', 'matters', 'tasks', 'full'];
    
    if (!validSyncTypes.includes(syncType)) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid sync type. Must be one of: ${validSyncTypes.join(', ')}`
      });
    }

    console.log(`🔄 Manual sync triggered by admin: ${req.user.id}, type: ${syncType}`);

    // Start sync in background
    const syncPromise = scheduledSyncService.triggerManualSync(syncType, req.user.id);

    // Don't wait for completion, return immediately
    res.json({
      status: 'success',
      message: `${syncType} sync initiated successfully`,
      syncType: syncType
    });

    // Handle sync completion/error in background
    syncPromise.catch(error => {
      console.error(`Manual ${syncType} sync failed:`, error);
    });

  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to trigger sync',
      error: error.message
    });
  }
});

/**
 * @route GET /api/sync/test-connection
 * @desc Test PracticePanther API connection
 * @access Admin only
 */
router.get('/test-connection', async (req, res) => {
  try {
    console.log('🔗 Testing PracticePanther connection...');
    const connectionResult = await practicePartnerService.testConnection();
    
    res.json({
      status: 'success',
      data: connectionResult
    });
  } catch (error) {
    console.error('Error testing connection:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to test connection',
      error: error.message
    });
  }
});

/**
 * @route GET /api/sync/statistics
 * @desc Get sync statistics and metrics
 * @access Admin only
 */
router.get('/statistics', async (req, res) => {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
    );

    // Get statistics from the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentSyncs, error } = await supabase
      .from('sync_logs')
      .select('*')
      .gte('started_at', thirtyDaysAgo.toISOString());

    if (error) {
      throw error;
    }

    const stats = {
      totalSyncs: recentSyncs?.length || 0,
      successfulSyncs: recentSyncs?.filter(s => s.status === 'success').length || 0,
      failedSyncs: recentSyncs?.filter(s => s.status === 'error').length || 0,
      partialSyncs: recentSyncs?.filter(s => s.status === 'partial').length || 0,
      totalRecordsProcessed: recentSyncs?.reduce((sum, s) => sum + (s.records_processed || 0), 0) || 0,
      totalRecordsCreated: recentSyncs?.reduce((sum, s) => sum + (s.records_created || 0), 0) || 0,
      totalRecordsUpdated: recentSyncs?.reduce((sum, s) => sum + (s.records_updated || 0), 0) || 0,
      lastSuccessfulSync: recentSyncs?.find(s => s.status === 'success')?.completed_at || null,
      averageSyncDuration: 0
    };

    res.json({
      status: 'success',
      data: {
        overall: stats,
        period: '30 days'
      }
    });
  } catch (error) {
    console.error('Error getting sync statistics:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to get sync statistics',
      error: error.message
    });
  }
});

module.exports = router; 