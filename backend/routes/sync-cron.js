const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Initialize database-supervised sync listener
const DbSupervisedSyncListener = require('../services/dbSupervisedSyncListener');
const dbSyncListener = new DbSupervisedSyncListener();

// Start the listener when this module loads
dbSyncListener.startListening().then(() => {
  console.log('✅ Database-supervised PP sync listener initialized');
}).catch(err => {
  console.error('❌ Failed to initialize database-supervised sync listener:', err);
});

// Middleware to ensure only admin/coordinator can access these routes
const adminOnly = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'coordinator')) {
    next();
  } else {
    res.status(403).json({ error: 'Unauthorized. Admin access required.' });
  }
};

// Get sync status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // TODO: Implement sync status check
    res.json({
      status: 'ok',
      lastSync: new Date().toISOString(),
      nextScheduledSync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({ error: 'Failed to get sync status' });
  }
});

// Trigger manual sync
router.post('/trigger', authenticateToken, async (req, res) => {
  try {
    // TODO: Implement manual sync trigger
    res.json({
      status: 'started',
      message: 'Manual sync triggered',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error triggering sync:', error);
    res.status(500).json({ error: 'Failed to trigger sync' });
  }
});

// Update sync schedule
router.put('/schedule', authenticateToken, async (req, res) => {
  try {
    const { schedule } = req.body;
    if (!schedule) {
      return res.status(400).json({ error: 'Schedule is required' });
    }

    // TODO: Implement schedule update
    res.json({
      status: 'updated',
      schedule,
      message: 'Sync schedule updated'
    });
  } catch (error) {
    console.error('Error updating sync schedule:', error);
    res.status(500).json({ error: 'Failed to update sync schedule' });
  }
});

// Test database-supervised sync (no auth required for testing)
router.post('/test-db-sync', async (req, res) => {
  try {
    const { sync_type = 'incremental' } = req.body;
    
    // Manually trigger the database-supervised sync listener
    const mockJob = {
      id: 'test-' + Date.now(),
      job_type: sync_type,
      status: 'running',
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    
    // Process the job directly
    await dbSyncListener.processDbSyncJob(mockJob);
    
    res.json({
      status: 'success',
      message: 'Database-supervised sync test completed',
      job: mockJob
    });
  } catch (error) {
    console.error('Error testing database-supervised sync:', error);
    res.status(500).json({ error: 'Failed to test database-supervised sync' });
  }
});

module.exports = router;