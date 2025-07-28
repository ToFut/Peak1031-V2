const cron = require('node-cron');
const practicePartnerService = require('./practicePartnerService');
const PracticePartnerSync = require('../models/PracticePartnerSync');
const logger = require('../utils/logger');

class ScheduledSyncService {
  constructor() {
    this.syncJob = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Get the latest sync configuration
      const lastSync = await PracticePartnerSync.findOne()
        .sort({ startTime: -1 });

      if (lastSync?.config?.enabled) {
        await this.startScheduledSync(lastSync.config.syncInterval);
      }

      this.isInitialized = true;
      logger.info('Scheduled sync service initialized');
    } catch (error) {
      logger.error('Failed to initialize scheduled sync service:', error);
    }
  }

  async startScheduledSync(intervalMinutes = 30) {
    if (this.syncJob) {
      this.syncJob.stop();
    }

    // Convert minutes to cron expression (every X minutes)
    const cronExpression = `*/${intervalMinutes} * * * *`;

    this.syncJob = cron.schedule(cronExpression, async () => {
      await this.performScheduledSync();
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    logger.info(`Scheduled sync started with interval: ${intervalMinutes} minutes`);
  }

  async stopScheduledSync() {
    if (this.syncJob) {
      this.syncJob.stop();
      this.syncJob = null;
      logger.info('Scheduled sync stopped');
    }
  }

  async performScheduledSync() {
    try {
      logger.info('Starting scheduled PracticePartner sync');

      // Check if there's already a running sync
      const runningSync = await PracticePartnerSync.findOne({
        status: 'running'
      });

      if (runningSync) {
        logger.warn('Sync already running, skipping scheduled sync');
        return;
      }

      // Perform incremental sync
      const result = await practicePartnerService.syncData('incremental');

      logger.info('Scheduled sync completed', {
        syncId: result.syncId,
        status: result.status,
        statistics: result.statistics
      });

    } catch (error) {
      logger.error('Scheduled sync failed:', error);
      
      // Create a failed sync record
      const syncId = require('uuid').v4();
      await PracticePartnerSync.create({
        syncId,
        syncType: 'incremental',
        status: 'failed',
        startTime: new Date(),
        endTime: new Date(),
        errors: [{
          recordId: 'SYSTEM',
          recordType: 'scheduled_sync',
          error: error.message
        }]
      });
    }
  }

  async updateSyncSchedule(intervalMinutes) {
    await this.stopScheduledSync();
    await this.startScheduledSync(intervalMinutes);
  }

  getSyncStatus() {
    return {
      isRunning: this.syncJob?.running || false,
      nextRun: this.syncJob?.nextDate() || null
    };
  }
}

module.exports = new ScheduledSyncService(); 