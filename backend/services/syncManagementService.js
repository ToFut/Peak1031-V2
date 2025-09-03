/**
 * Sync Management Service
 * Manages scheduled and batch synchronization operations
 */

const cron = require('node-cron');
const { createClient } = require('@supabase/supabase-js');
const autoSyncService = require('./autoSyncService');
const AuditService = require('./audit');

class SyncManagementService {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    this.isRunning = false;
    this.scheduledJobs = new Map();
  }

  /**
   * Initialize scheduled sync jobs
   */
  initializeScheduledSyncs() {
    console.log('🚀 Initializing scheduled entity syncs...');

    // Daily full sync at 2 AM
    const dailySync = cron.schedule('0 2 * * *', async () => {
      console.log('🌅 Running scheduled daily entity sync...');
      await this.triggerFullSync('scheduled_daily');
    }, {
      scheduled: false,
      timezone: 'America/Los_Angeles'
    });

    // Hourly incremental sync during business hours (9 AM - 6 PM, Mon-Fri)
    const businessHourSync = cron.schedule('0 9-18 * * 1-5', async () => {
      console.log('🕘 Running scheduled business hour entity sync...');
      await this.triggerIncrementalSync('scheduled_hourly');
    }, {
      scheduled: false,
      timezone: 'America/Los_Angeles'
    });

    this.scheduledJobs.set('daily', dailySync);
    this.scheduledJobs.set('business_hour', businessHourSync);

    // Start the schedules if enabled
    if (process.env.ENABLE_SCHEDULED_SYNC !== 'false') {
      dailySync.start();
      businessHourSync.start();
      console.log('✅ Scheduled entity syncs enabled');
    } else {
      console.log('⏸️ Scheduled entity syncs disabled');
    }
  }

  /**
   * Trigger full sync of all exchanges
   * @param {string} syncType - Type of sync trigger
   * @returns {Object} Sync results
   */
  async triggerFullSync(syncType = 'manual') {
    if (this.isRunning) {
      console.log('⚠️ Sync already running, skipping...');
      return { success: false, error: 'Sync already in progress' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log(`🔄 Starting full entity sync (${syncType})...`);

      // Log sync start
      await AuditService.log({
        action: 'FULL_ENTITY_SYNC_STARTED',
        entityType: 'system',
        details: {
          sync_type: syncType,
          started_at: new Date().toISOString()
        }
      });

      // Get all active exchanges with PP data
      const { data: exchanges, error } = await this.supabase
        .from('exchanges')
        .select('id, name, pp_matter_id, entities_sync_status, entities_synced_at')
        .eq('is_active', true)
        .not('pp_data', 'is', null)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch exchanges: ${error.message}`);
      }

      console.log(`📊 Found ${exchanges.length} exchanges to sync`);

      const results = {
        total_exchanges: exchanges.length,
        successful: 0,
        failed: 0,
        skipped: 0,
        total_entities: 0,
        total_users_created: 0,
        total_contacts_created: 0,
        total_participants_added: 0,
        duration_ms: 0
      };

      // Process exchanges in batches to avoid overwhelming the system
      const batchSize = 5;
      for (let i = 0; i < exchanges.length; i += batchSize) {
        const batch = exchanges.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (exchange) => {
          try {
            console.log(`⏳ Syncing exchange: ${exchange.name} (${exchange.pp_matter_id})`);
            
            const syncResult = await autoSyncService.syncExchangeEntities(exchange.id);
            
            if (syncResult.success) {
              results.successful++;
              if (syncResult.results) {
                results.total_entities += syncResult.results.entities_found || 0;
                results.total_users_created += syncResult.results.users_created || 0;
                results.total_contacts_created += syncResult.results.contacts_created || 0;
                results.total_participants_added += syncResult.results.participants_added || 0;
              }
            } else {
              results.failed++;
              console.error(`❌ Failed to sync ${exchange.name}: ${syncResult.error}`);
            }
          } catch (error) {
            results.failed++;
            console.error(`❌ Exception syncing ${exchange.name}:`, error);
          }
        }));

        // Small delay between batches
        if (i + batchSize < exchanges.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      results.duration_ms = Date.now() - startTime;
      
      console.log(`✅ Full sync completed in ${results.duration_ms}ms:`);
      console.log(`   📊 Total: ${results.total_exchanges}`);
      console.log(`   ✅ Successful: ${results.successful}`);
      console.log(`   ❌ Failed: ${results.failed}`);
      console.log(`   👥 Users created: ${results.total_users_created}`);
      console.log(`   📇 Contacts created: ${results.total_contacts_created}`);
      console.log(`   🤝 Participants added: ${results.total_participants_added}`);

      // Log sync completion
      await AuditService.log({
        action: 'FULL_ENTITY_SYNC_COMPLETED',
        entityType: 'system',
        details: {
          sync_type: syncType,
          ...results,
          completed_at: new Date().toISOString()
        }
      });

      return { success: true, results };

    } catch (error) {
      console.error('❌ Full sync failed:', error);
      
      await AuditService.log({
        action: 'FULL_ENTITY_SYNC_FAILED',
        entityType: 'system',
        details: {
          sync_type: syncType,
          error: error.message,
          duration_ms: Date.now() - startTime,
          failed_at: new Date().toISOString()
        }
      });

      return { success: false, error: error.message };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Trigger incremental sync (only recently updated exchanges)
   * @param {string} syncType - Type of sync trigger
   * @returns {Object} Sync results
   */
  async triggerIncrementalSync(syncType = 'manual') {
    if (this.isRunning) {
      console.log('⚠️ Sync already running, skipping...');
      return { success: false, error: 'Sync already in progress' };
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      console.log(`🔄 Starting incremental entity sync (${syncType})...`);

      // Get exchanges that need syncing (updated recently or never synced)
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

      const { data: exchanges, error } = await this.supabase
        .from('exchanges')
        .select('id, name, pp_matter_id, entities_sync_status, entities_synced_at, updated_at')
        .eq('is_active', true)
        .not('pp_data', 'is', null)
        .or(`entities_synced_at.is.null,entities_synced_at.lt.${cutoffTime.toISOString()},updated_at.gt.${cutoffTime.toISOString()}`)
        .limit(50); // Limit incremental syncs

      if (error) {
        throw new Error(`Failed to fetch exchanges: ${error.message}`);
      }

      if (exchanges.length === 0) {
        console.log('✅ No exchanges need incremental sync');
        return { success: true, results: { message: 'No exchanges needed sync' } };
      }

      console.log(`📊 Found ${exchanges.length} exchanges for incremental sync`);

      const results = {
        total_exchanges: exchanges.length,
        successful: 0,
        failed: 0,
        duration_ms: 0
      };

      // Process exchanges sequentially for incremental sync
      for (const exchange of exchanges) {
        try {
          const syncResult = await autoSyncService.syncExchangeEntities(exchange.id);
          
          if (syncResult.success) {
            results.successful++;
          } else {
            results.failed++;
          }
        } catch (error) {
          results.failed++;
          console.error(`❌ Failed incremental sync for ${exchange.name}:`, error);
        }

        // Small delay between exchanges
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      results.duration_ms = Date.now() - startTime;
      
      console.log(`✅ Incremental sync completed: ${results.successful}/${results.total_exchanges} successful`);

      return { success: true, results };

    } catch (error) {
      console.error('❌ Incremental sync failed:', error);
      return { success: false, error: error.message };
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Trigger sync for a specific exchange
   * @param {string} exchangeId - Exchange ID to sync
   * @returns {Object} Sync results
   */
  async triggerExchangeSync(exchangeId) {
    console.log(`🎯 Triggering single exchange sync: ${exchangeId}`);
    return await autoSyncService.syncExchangeEntities(exchangeId);
  }

  /**
   * Get current sync status
   * @returns {Object} Sync status
   */
  getSyncStatus() {
    return {
      is_running: this.isRunning,
      scheduled_jobs_active: Array.from(this.scheduledJobs.entries()).map(([name, job]) => ({
        name,
        running: job.running,
        destroyed: job.destroyed
      })),
      next_scheduled_runs: {
        daily: this.scheduledJobs.get('daily')?.nextDates()?.toString(),
        business_hour: this.scheduledJobs.get('business_hour')?.nextDates()?.toString()
      }
    };
  }

  /**
   * Stop all scheduled jobs
   */
  stopScheduledSyncs() {
    console.log('⏹️ Stopping all scheduled syncs...');
    
    for (const [name, job] of this.scheduledJobs.entries()) {
      if (job && !job.destroyed) {
        job.stop();
        console.log(`⏹️ Stopped ${name} sync job`);
      }
    }
  }

  /**
   * Start all scheduled jobs
   */
  startScheduledSyncs() {
    console.log('▶️ Starting all scheduled syncs...');
    
    for (const [name, job] of this.scheduledJobs.entries()) {
      if (job && !job.destroyed) {
        job.start();
        console.log(`▶️ Started ${name} sync job`);
      }
    }
  }

  /**
   * Get sync statistics
   * @returns {Object} Sync statistics
   */
  async getSyncStatistics() {
    try {
      const { data: stats } = await this.supabase
        .from('entity_sync_statistics')
        .select('*')
        .single();

      const { data: recentActivity } = await this.supabase
        .from('entity_sync_logs')
        .select('sync_status, started_at')
        .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('started_at', { ascending: false });

      return {
        overview: stats || {
          total_exchanges: 0,
          synced_exchanges: 0,
          failed_syncs: 0,
          pending_syncs: 0
        },
        recent_activity: recentActivity || [],
        current_status: this.getSyncStatus()
      };
    } catch (error) {
      console.error('❌ Failed to get sync statistics:', error);
      return {
        overview: null,
        recent_activity: [],
        current_status: this.getSyncStatus(),
        error: error.message
      };
    }
  }

  /**
   * Cleanup old sync logs (keep last 30 days)
   */
  async cleanupOldSyncLogs() {
    try {
      const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const { error } = await this.supabase
        .from('entity_sync_logs')
        .delete()
        .lt('started_at', cutoffDate.toISOString());

      if (error) throw error;

      console.log('🧹 Cleaned up old sync logs');
    } catch (error) {
      console.error('❌ Failed to cleanup sync logs:', error);
    }
  }
}

module.exports = new SyncManagementService();