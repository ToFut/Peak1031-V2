const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

/**
 * Database-Supervised Sync Listener
 * Listens for pg_notify events from database and calls existing PP API endpoints
 */
class DbSupervisedSyncListener {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
    );
    this.isListening = false;
  }

  /**
   * Start listening for database notifications
   */
  async startListening() {
    if (this.isListening) {
      console.log('⚠️  Database-supervised sync listener already running');
      return;
    }

    try {
      // Subscribe to the pp_existing_sync channel
      const channel = this.supabase
        .channel('db-supervised-sync')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'pp_sync_jobs'
        }, async (payload) => {
          console.log('📊 Database sync job event:', payload);
          
          // Only process new jobs
          if (payload.eventType === 'INSERT' && payload.new.status === 'running') {
            await this.processDbSyncJob(payload.new);
          }
        })
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Database-supervised sync listener started');
            this.isListening = true;
          } else {
            console.log('❌ Failed to subscribe to database sync events:', status);
          }
        });

      // Also listen for direct NOTIFY events
      this.setupNotifyListener();
      
      return channel;
    } catch (error) {
      console.error('❌ Error starting database-supervised sync listener:', error);
    }
  }

  /**
   * Setup NOTIFY listener (alternative method)
   */
  setupNotifyListener() {
    // This is a simplified approach - in production you might need pg library
    console.log('📡 NOTIFY listener setup (would need pg library for full implementation)');
  }

  /**
   * Process database sync job by calling existing API
   */
  async processDbSyncJob(job) {
    try {
      console.log(`🔄 Processing database-supervised sync job: ${job.id} (${job.job_type})`);
      
      // Update job status to running
      await this.supabase
        .from('pp_sync_jobs')
        .update({ 
          status: 'processing',
          started_at: new Date().toISOString()
        })
        .eq('id', job.id);

      // Call the existing comprehensive PP sync API
      const apiUrl = `http://localhost:${process.env.PORT || 5001}/api/practice-panther/sync-now`;
      const syncData = {
        limit: job.job_type === 'full' ? 100 : 25, // More items for full sync
        triggered_by: 'database_supervised_cron',
        job_id: job.id
      };

      console.log(`📞 Calling existing PP API: ${apiUrl}`);
      const response = await axios.post(apiUrl, syncData, {
        headers: {
          'Content-Type': 'application/json',
          // Add any required auth headers here if needed
        },
        timeout: 300000 // 5 minute timeout
      });

      if (response.data.success) {
        // Update job as completed
        await this.supabase
          .from('pp_sync_jobs')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString(),
            records_synced: response.data.results?.totalSynced || 0,
            metadata: {
              api_response: response.data,
              called_endpoint: apiUrl,
              sync_summary: response.data.results
            }
          })
          .eq('id', job.id);

        console.log(`✅ Database-supervised sync completed: ${job.id}`);
        console.log(`📊 Results: ${response.data.results?.totalSynced || 0} records synced`);
      } else {
        throw new Error(`API returned error: ${response.data.error || 'Unknown error'}`);
      }

    } catch (error) {
      console.error(`❌ Database-supervised sync failed for job ${job.id}:`, error.message);
      
      // Update job as failed
      await this.supabase
        .from('pp_sync_jobs')
        .update({ 
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error.message,
          metadata: {
            error_details: error.response?.data || error.message,
            called_endpoint: 'http://localhost:5001/api/practice-panther/sync-now'
          }
        })
        .eq('id', job.id);
    }
  }

  /**
   * Stop listening
   */
  stopListening() {
    if (this.channel) {
      this.channel.unsubscribe();
    }
    this.isListening = false;
    console.log('🛑 Database-supervised sync listener stopped');
  }

  /**
   * Get listener status
   */
  getStatus() {
    return {
      listening: this.isListening,
      service: 'Database-Supervised PP Sync',
      description: 'Listens for pg_cron jobs and calls existing PP API endpoints'
    };
  }
}

module.exports = DbSupervisedSyncListener;