const express = require('express');
const router = express.Router();
const practicePartnerService = require('../services/practicePartnerService');
const PracticePartnerSync = require('../models/PracticePartnerSync');
const { authenticateToken } = require('../middleware/auth');

// Get sync status and configuration
router.get('/sync/status', authenticateToken, async (req, res) => {
  try {
    const lastSync = await PracticePartnerSync.findOne({
      status: { $in: ['completed', 'partial'] }
    }).sort({ startTime: -1 });

    const config = {
      enabled: true,
      lastSyncTime: lastSync?.config?.lastSyncTime || null,
      syncInterval: 30, // minutes
      nextSyncTime: lastSync?.config?.lastSyncTime 
        ? new Date(lastSync.config.lastSyncTime.getTime() + (30 * 60 * 1000))
        : null
    };

    res.json({
      success: true,
      data: {
        config,
        lastSync: lastSync ? {
          syncId: lastSync.syncId,
          status: lastSync.status,
          startTime: lastSync.startTime,
          endTime: lastSync.endTime,
          statistics: lastSync.statistics
        } : null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start a manual sync
router.post('/sync/start', authenticateToken, async (req, res) => {
  try {
    const { syncType = 'incremental' } = req.body;
    
    // Check if there's already a running sync
    const runningSync = await PracticePartnerSync.findOne({
      status: 'running'
    });

    if (runningSync) {
      return res.status(409).json({
        success: false,
        error: 'A sync is already running'
      });
    }

    // Start the sync process
    const result = await practicePartnerService.syncData(syncType, req.user.id);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get sync history (audit trail)
router.get('/sync/history', authenticateToken, async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const syncs = await PracticePartnerSync.find()
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('createdBy', 'firstName lastName email');

    const total = await PracticePartnerSync.countDocuments();

    res.json({
      success: true,
      data: {
        syncs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get detailed sync information
router.get('/sync/:syncId', authenticateToken, async (req, res) => {
  try {
    const { syncId } = req.params;
    
    const sync = await PracticePartnerSync.findOne({ syncId })
      .populate('createdBy', 'firstName lastName email');

    if (!sync) {
      return res.status(404).json({
        success: false,
        error: 'Sync not found'
      });
    }

    res.json({
      success: true,
      data: sync
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update sync configuration
router.put('/sync/config', authenticateToken, async (req, res) => {
  try {
    const { enabled, syncInterval } = req.body;

    // Update the latest sync record with new config
    const lastSync = await PracticePartnerSync.findOne()
      .sort({ startTime: -1 });

    if (lastSync) {
      await PracticePartnerSync.findByIdAndUpdate(lastSync._id, {
        'config.enabled': enabled,
        'config.syncInterval': syncInterval
      });
    }

    res.json({
      success: true,
      message: 'Configuration updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get sync statistics
router.get('/sync/statistics', authenticateToken, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const syncs = await PracticePartnerSync.find({
      startTime: { $gte: startDate }
    });

    const statistics = {
      totalSyncs: syncs.length,
      successfulSyncs: syncs.filter(s => s.status === 'completed').length,
      failedSyncs: syncs.filter(s => s.status === 'failed').length,
      partialSyncs: syncs.filter(s => s.status === 'partial').length,
      totalRecordsProcessed: syncs.reduce((sum, s) => sum + s.statistics.totalRecords, 0),
      totalRecordsImported: syncs.reduce((sum, s) => sum + s.statistics.importedRecords, 0),
      totalRecordsUpdated: syncs.reduce((sum, s) => sum + s.statistics.updatedRecords, 0),
      totalErrors: syncs.reduce((sum, s) => sum + s.errors.length, 0),
      averageSyncDuration: syncs.length > 0 
        ? syncs.reduce((sum, s) => {
            if (s.endTime && s.startTime) {
              return sum + (s.endTime - s.startTime);
            }
            return sum;
          }, 0) / syncs.length
        : 0
    };

    res.json({
      success: true,
      data: statistics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test PracticePartner connection
router.post('/test-connection', authenticateToken, async (req, res) => {
  try {
    const response = await practicePartnerService.client.get('/api/health');
    
    res.json({
      success: true,
      data: {
        connected: true,
        status: response.status,
        message: 'Successfully connected to PracticePartner'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: `Connection failed: ${error.message}`,
      data: {
        connected: false
      }
    });
  }
});

// Get data mapping preview
router.post('/mapping/preview', authenticateToken, async (req, res) => {
  try {
    const { sampleData, dataType } = req.body;
    
    let transformedData;
    switch (dataType) {
      case 'client':
        transformedData = practicePartnerService.transformClientData(sampleData);
        break;
      case 'matter':
        transformedData = practicePartnerService.transformMatterData(sampleData);
        break;
      case 'document':
        transformedData = practicePartnerService.transformDocumentData(sampleData);
        break;
      default:
        throw new Error('Invalid data type');
    }

    res.json({
      success: true,
      data: {
        original: sampleData,
        transformed: transformedData
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 