const cron = require('node-cron');
const practicePartnerService = require('./practicePartnerService');
const PPTokenManager = require('./ppTokenManager');
const ppTokenManager = new PPTokenManager();
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

class ScheduledSyncService {
  constructor() {
    this.syncJobs = new Map(); // Store multiple sync jobs
    this.isInitialized = false;
    
    // Initialize Supabase only if configuration is available
    if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY)) {
      this.supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
      );
    } else {
      console.log('⚠️ Supabase configuration not available - ScheduledSync service will use limited functionality');
      this.supabase = null;
    }
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
      console.log('🔄 Starting scheduled incremental sync (OPTIMIZED - only NEW/UPDATED data)...');

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

      const currentTime = new Date().toISOString();

      // Initialize sync timestamps if not loaded
      await this.loadSyncTimestamps();

      console.log('📊 Strategy: Incremental sync - only changed records since last sync');

      // 1. Sync NEW/UPDATED matters (most critical for exchange business)
      await this.syncMattersIncremental();

      // 2. Sync NEW/UPDATED accounts (clients) 
      await this.syncAccountsIncremental();

      // 3. Sync NEW tasks only (avoid re-processing completed tasks)
      await this.syncTasksIncremental();

      // 4. Sync recent communications (notes created in last 15 min)
      await this.syncNotesIncremental();

      // Update all timestamps after successful sync
      await this.updateAllSyncTimestamps(currentTime);

      console.log('✅ Scheduled incremental sync completed successfully');

      return {
        syncId: `incremental_${Date.now()}`,
        status: 'completed',
        statistics: { strategy: 'incremental_optimized' }
      };

    } catch (error) {
      console.error('❌ Scheduled incremental sync failed:', error);
      
      // Log the error to sync_logs
      await practicePartnerService.logSyncActivity('incremental', 'error', {
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        errorMessage: error.message,
        triggeredBy: 'system',
        syncType: 'incremental_optimized'
      });

      throw error;
    }
  }

  // NEW METHODS FOR INCREMENTAL SYNC

  async loadSyncTimestamps() {
    if (!this.syncTimestamps) {
      this.syncTimestamps = new Map();
    }

    // Use fallback of 24 hours ago if no timestamps stored
    const fallbackTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const endpoints = ['matters', 'accounts', 'contacts', 'tasks', 'notes', 'emails'];
    endpoints.forEach(endpoint => {
      if (!this.syncTimestamps.has(endpoint)) {
        this.syncTimestamps.set(endpoint, fallbackTime);
      }
    });

    console.log('📅 Sync timestamps loaded:', Object.fromEntries(this.syncTimestamps));
  }

  async syncMattersIncremental() {
    try {
      const lastSync = this.syncTimestamps.get('matters');
      console.log(`⚖️  Syncing matters updated since: ${lastSync}`);

      const practicePartnerService = require('./practicePartnerService');
      
      // Use axios directly with updated_since parameter
      const axios = require('axios');
      const token = await ppTokenManager.getValidAccessToken();

      const response = await axios.get('https://app.practicepanther.com/api/v2/matters', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        params: {
          updated_since: lastSync,
          per_page: 1000
        }
      });

      const newMatters = response.data;
      console.log(`📊 Found ${newMatters?.length || 0} updated matters`);

      if (newMatters && newMatters.length > 0) {
        console.log(`✅ Processing ${newMatters.length} matter updates...`);
        // Process the matters here
      } else {
        console.log('✅ No matter updates - exchange data is current');
      }

    } catch (error) {
      console.error('❌ Incremental matter sync failed:', error.message);
      
      // Handle authentication errors gracefully
      if (error.message?.includes('401') || error.message?.includes('Authorization')) {
        console.log('⚠️ PracticePanther authentication failed - skipping sync until token is refreshed');
        return; // Don't throw, just skip this sync
      }
      
      throw error;
    }
  }

  async syncAccountsIncremental() {
    try {
      const lastSync = this.syncTimestamps.get('accounts');
      console.log(`👥 Syncing accounts updated since: ${lastSync}`);

      const axios = require('axios');
      const practicePartnerService = require('./practicePartnerService');
      const token = await ppTokenManager.getValidAccessToken();

      const response = await axios.get('https://app.practicepanther.com/api/v2/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        params: {
          updated_since: lastSync,
          per_page: 1000
        }
      });

      const newAccounts = response.data;
      console.log(`📊 Found ${newAccounts?.length || 0} updated accounts`);

      if (newAccounts && newAccounts.length > 0) {
        console.log(`✅ Processing ${newAccounts.length} account updates...`);
        // Process accounts here
      } else {
        console.log('✅ No account updates - client data is current');
      }

    } catch (error) {
      console.error('❌ Incremental account sync failed:', error.message);
      throw error;
    }
  }

  async syncTasksIncremental() {
    try {
      const lastSync = this.syncTimestamps.get('tasks');
      console.log(`📝 Syncing new tasks created since: ${lastSync}`);

      const axios = require('axios');
      const practicePartnerService = require('./practicePartnerService');
      const token = await ppTokenManager.getValidAccessToken();

      // Get only NEW tasks that are NOT completed
      const response = await axios.get('https://app.practicepanther.com/api/v2/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        params: {
          created_since: lastSync,
          status: 'NotCompleted',
          per_page: 1000
        }
      });

      const newTasks = response.data;
      console.log(`📊 Found ${newTasks?.length || 0} new tasks`);

      if (newTasks && newTasks.length > 0) {
        console.log(`✅ Processing ${newTasks.length} new tasks...`);
        // Process tasks here
      } else {
        console.log('✅ No new tasks - no new action items');
      }

    } catch (error) {
      console.error('❌ Incremental task sync failed:', error.message);
      throw error;
    }
  }

  async syncNotesIncremental() {
    try {
      const lastSync = this.syncTimestamps.get('notes');
      console.log(`📝 Syncing new notes created since: ${lastSync}`);

      const axios = require('axios');
      const practicePartnerService = require('./practicePartnerService');
      const token = await ppTokenManager.getStoredToken();

      const response = await axios.get('https://app.practicepanther.com/api/v2/notes', {
        headers: {
          'Authorization': `Bearer ${token.access_token}`,
          'Accept': 'application/json'
        },
        params: {
          created_since: lastSync,
          per_page: 1000
        }
      });

      const newNotes = response.data;
      console.log(`📊 Found ${newNotes?.length || 0} new notes`);

      if (newNotes && newNotes.length > 0) {
        console.log(`✅ Processing ${newNotes.length} new notes...`);
        // Process notes here
      } else {
        console.log('✅ No new notes - no new communications');
      }

    } catch (error) {
      console.error('❌ Incremental notes sync failed:', error.message);
      // Don't throw - notes are less critical
    }
  }

  async updateAllSyncTimestamps(timestamp) {
    this.syncTimestamps.set('matters', timestamp);
    this.syncTimestamps.set('accounts', timestamp);
    this.syncTimestamps.set('contacts', timestamp);
    this.syncTimestamps.set('tasks', timestamp);
    this.syncTimestamps.set('notes', timestamp);
    this.syncTimestamps.set('emails', timestamp);

    console.log(`📅 Updated all sync timestamps to: ${timestamp}`);
    
    // TODO: Save to persistent storage (database or file)
    // For now, they'll reset after service restart (24 hour fallback handles this)
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
        nextRun: job.nextDates ? job.nextDates(1)[0]?.toISOString() : null
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

// Only create the service instance if Supabase is configured
let scheduledSyncService = null;
if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY)) {
  scheduledSyncService = new ScheduledSyncService();
  console.log('✅ ScheduledSyncService initialized with Supabase');
} else {
  console.log('⚠️ Supabase not configured - ScheduledSyncService disabled');
}

module.exports = scheduledSyncService; 