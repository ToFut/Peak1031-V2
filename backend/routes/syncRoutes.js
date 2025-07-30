const express = require('express');
const router = express.Router();
const practicePartnerService = require('../services/practicePartnerService');
const scheduledSyncService = require('../services/scheduledSyncService');
const auth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/roles');

// All sync routes require admin privileges
router.use(auth);
router.use(requireAdmin);

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
 * @route GET /api/sync/logs
 * @desc Get detailed sync logs with pagination
 * @access Admin only
 */
router.get('/logs', async (req, res) => {
  try {
    const { page = 1, limit = 20, syncType, status } = req.query;
    
    let query = `
      SELECT *
      FROM sync_logs
    `;
    
    const conditions = [];
    const params = [];
    
    if (syncType) {
      conditions.push(`sync_type = $${params.length + 1}`);
      params.push(syncType);
    }
    
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ORDER BY started_at DESC`;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    
    params.push(parseInt(limit));
    params.push((parseInt(page) - 1) * parseInt(limit));

    // Use Supabase to execute query
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
    );

    let supabaseQuery = supabase
      .from('sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .range((parseInt(page) - 1) * parseInt(limit), parseInt(page) * parseInt(limit) - 1);

    if (syncType) {
      supabaseQuery = supabaseQuery.eq('sync_type', syncType);
    }
    
    if (status) {
      supabaseQuery = supabaseQuery.eq('status', status);
    }

    const { data, error, count } = await supabaseQuery;

    if (error) {
      throw error;
    }

    res.json({
      status: 'success',
      data: {
        logs: data || [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / parseInt(limit))
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

    // Calculate average sync duration
    const completedSyncs = recentSyncs?.filter(s => s.completed_at && s.started_at) || [];
    if (completedSyncs.length > 0) {
      const totalDuration = completedSyncs.reduce((sum, s) => {
        const start = new Date(s.started_at);
        const end = new Date(s.completed_at);
        return sum + (end - start);
      }, 0);
      stats.averageSyncDuration = Math.round(totalDuration / completedSyncs.length / 1000); // in seconds
    }

    // Sync type breakdown
    const syncTypeStats = {};
    recentSyncs?.forEach(sync => {
      if (!syncTypeStats[sync.sync_type]) {
        syncTypeStats[sync.sync_type] = {
          total: 0,
          successful: 0,
          failed: 0,
          partial: 0
        };
      }
      syncTypeStats[sync.sync_type].total++;
      if (sync.status === 'success') syncTypeStats[sync.sync_type].successful++;
      else if (sync.status === 'error') syncTypeStats[sync.sync_type].failed++;
      else if (sync.status === 'partial') syncTypeStats[sync.sync_type].partial++;
    });

    res.json({
      status: 'success',
      data: {
        overall: stats,
        byType: syncTypeStats,
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

/**
 * @route PUT /api/sync/schedule
 * @desc Update sync schedule settings
 * @access Admin only
 */
router.put('/schedule', async (req, res) => {
  try {
    const { 
      incrementalInterval = 15, 
      fullSyncHour = 2, 
      fullSyncMinute = 0 
    } = req.body;

    // Validate inputs
    if (incrementalInterval < 5 || incrementalInterval > 1440) {
      return res.status(400).json({
        status: 'error',
        message: 'Incremental interval must be between 5 and 1440 minutes'
      });
    }

    if (fullSyncHour < 0 || fullSyncHour > 23 || fullSyncMinute < 0 || fullSyncMinute > 59) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid time for full sync'
      });
    }

    // Update schedules
    await Promise.all([
      scheduledSyncService.updateIncrementalSyncSchedule(incrementalInterval),
      scheduledSyncService.updateDailyFullSyncSchedule(fullSyncHour, fullSyncMinute)
    ]);

    console.log(`📅 Sync schedule updated by admin ${req.user.id}:`, {
      incrementalInterval,
      fullSyncTime: `${fullSyncHour}:${fullSyncMinute.toString().padStart(2, '0')}`
    });

    res.json({
      status: 'success',
      message: 'Sync schedule updated successfully',
      data: {
        incrementalInterval,
        fullSyncHour,
        fullSyncMinute
      }
    });
  } catch (error) {
    console.error('Error updating sync schedule:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update sync schedule',
      error: error.message
    });
  }
});

/**
 * @route POST /api/sync/stop
 * @desc Stop all scheduled syncs (emergency stop)
 * @access Admin only
 */
router.post('/stop', async (req, res) => {
  try {
    await scheduledSyncService.stopAllSyncJobs();
    
    console.log(`🛑 All sync jobs stopped by admin: ${req.user.id}`);

    res.json({
      status: 'success',
      message: 'All scheduled syncs stopped successfully'
    });
  } catch (error) {
    console.error('Error stopping syncs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to stop syncs',
      error: error.message
    });
  }
});

/**
 * @route POST /api/sync/restart
 * @desc Restart all scheduled syncs
 * @access Admin only
 */
router.post('/restart', async (req, res) => {
  try {
    await scheduledSyncService.initialize();
    
    console.log(`🔄 Sync service restarted by admin: ${req.user.id}`);

    res.json({
      status: 'success',
      message: 'Sync service restarted successfully'
    });
  } catch (error) {
    console.error('Error restarting syncs:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to restart syncs',
      error: error.message
    });
  }
});

module.exports = router;