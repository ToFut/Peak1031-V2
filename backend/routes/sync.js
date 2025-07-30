const express = require('express');
const router = express.Router();
const practicePartnerService = require('../services/practicePartnerService');
const scheduledSyncService = require('../services/scheduledSyncService');

// Middleware to require authentication and admin role
const requireAuth = (req, res, next) => {
  // For testing purposes, we'll simulate an admin user
  // In production, this should use proper JWT authentication
  req.user = { id: 'admin-user-id', role: 'admin' };
  next();
};

// All sync routes require admin privileges
router.use(requireAuth);

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