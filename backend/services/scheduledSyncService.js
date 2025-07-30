const cron = require('node-cron');
const practicePartnerService = require('./practicePartnerService');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

class ScheduledSyncService {
  constructor() {
    this.syncJobs = new Map(); // Store multiple sync jobs
    this.isInitialized = false;
    
    // Initialize Supabase
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
    );
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('🔄 Initializing scheduled sync service...');

      // Start default incremental sync every 15 minutes
      await this.startIncrementalSync();
      
      // Start full sync daily at 2 AM
      await this.startDailyFullSync();

      this.isInitialized = true;
      console.log('✅ Scheduled sync service initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize scheduled sync service:', error);
    }
  }

  /**
   * Start incremental sync job
   */
  async startIncrementalSync(intervalMinutes = 15) {
    if (this.syncJobs.has('incremental')) {
      this.syncJobs.get('incremental').stop();
    }

    // Convert minutes to cron expression (every X minutes)
    const cronExpression = intervalMinutes < 60 
      ? `*/${intervalMinutes} * * * *`  // Every X minutes
      : `0 */${Math.floor(intervalMinutes / 60)} * * *`; // Every X hours

    const job = cron.schedule(cronExpression, async () => {
      await this.performIncrementalSync();
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    this.syncJobs.set('incremental', job);
    console.log(`🕐 Incremental sync scheduled every ${intervalMinutes} minutes`);
  }

  /**
   * Start daily full sync
   */
  async startDailyFullSync(hour = 2, minute = 0) {
    if (this.syncJobs.has('daily_full')) {
      this.syncJobs.get('daily_full').stop();
    }

    // Daily at specific time
    const cronExpression = `${minute} ${hour} * * *`;

    const job = cron.schedule(cronExpression, async () => {
      await this.performFullSync();
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    this.syncJobs.set('daily_full', job);
    console.log(`🕐 Daily full sync scheduled at ${hour}:${minute.toString().padStart(2, '0')}`);
  }

  /**
   * Stop specific sync job
   */
  async stopSyncJob(jobName) {
    if (this.syncJobs.has(jobName)) {
      this.syncJobs.get(jobName).stop();
      this.syncJobs.delete(jobName);
      console.log(`🛑 Stopped ${jobName} sync job`);
    }
  }

  /**
   * Stop all sync jobs
   */
  async stopAllSyncJobs() {
    for (const [jobName, job] of this.syncJobs) {
      job.stop();
      console.log(`🛑 Stopped ${jobName} sync job`);
    }
    this.syncJobs.clear();
  }

  /**
   * Perform incremental sync (for scheduled runs)
   */
  async performIncrementalSync() {
    try {
      console.log('🔄 Starting scheduled incremental sync...');

      // Check if there's already a running sync
      const { data: runningSync } = await this.supabase
        .from('sync_logs')
        .select('id')
        .eq('status', 'running')
        .limit(1);

      if (runningSync && runningSync.length > 0) {
        console.log('⚠️ Sync already running, skipping scheduled sync');
        return;
      }

      // Perform incremental sync of contacts (fastest changing data)
      const result = await practicePartnerService.performIncrementalSync('contacts', 'system');

      console.log('✅ Scheduled incremental sync completed:', {
        syncId: result.syncId,
        status: result.status,
        statistics: result.statistics
      });

      return result;

    } catch (error) {
      console.error('❌ Scheduled incremental sync failed:', error);
      
      // Log the error to sync_logs
      await practicePartnerService.logSyncActivity('contacts', 'error', {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        errorMessage: error.message,
        triggeredBy: 'system'
      });

      throw error;
    }
  }

  /**
   * Perform full sync (for daily runs)
   */
  async performFullSync() {
    try {
      console.log('🔄 Starting scheduled full sync...');

      // Check if there's already a running sync
      const { data: runningSync } = await this.supabase
        .from('sync_logs')
        .select('id')
        .eq('status', 'running')
        .limit(1);

      if (runningSync && runningSync.length > 0) {
        console.log('⚠️ Sync already running, skipping scheduled sync');
        return;
      }

      // Perform full sync
      const result = await practicePartnerService.performFullSync('system');

      console.log('✅ Scheduled full sync completed:', {
        status: result.status,
        results: result.results
      });

      return result;

    } catch (error) {
      console.error('❌ Scheduled full sync failed:', error);
      throw error;
    }
  }

  /**
   * Update sync schedule
   */
  async updateIncrementalSyncSchedule(intervalMinutes) {
    await this.stopSyncJob('incremental');
    await this.startIncrementalSync(intervalMinutes);
  }

  async updateDailyFullSyncSchedule(hour, minute = 0) {
    await this.stopSyncJob('daily_full');
    await this.startDailyFullSync(hour, minute);
  }

  /**
   * Get sync status
   */
  getSyncStatus() {
    const jobs = {};
    for (const [jobName, job] of this.syncJobs) {
      jobs[jobName] = {
        isRunning: job.running || false,
        nextRun: job.nextDate() ? job.nextDate().toISOString() : null
      };
    }
    
    return {
      isInitialized: this.isInitialized,
      jobs,
      totalJobs: this.syncJobs.size
    };
  }

  /**
   * Manual sync trigger (for admin use)
   */
  async triggerManualSync(syncType = 'contacts', userId = null) {
    try {
      console.log(`🔄 Manual ${syncType} sync triggered by user: ${userId}`);
      
      if (syncType === 'full') {
        return await practicePartnerService.performFullSync(userId);
      } else {
        return await practicePartnerService.performIncrementalSync(syncType, userId);
      }
    } catch (error) {
      console.error(`❌ Manual ${syncType} sync failed:`, error);
      throw error;
    }
  }

  /**
   * Get recent sync history
   */
  async getSyncHistory(limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('sync_logs')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting sync history:', error);
      throw error;
    }
  }
}

module.exports = new ScheduledSyncService(); 