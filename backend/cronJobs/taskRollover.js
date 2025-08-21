const cron = require('node-cron');
const taskRolloverService = require('../services/taskRolloverService');

class TaskRolloverCron {
  constructor() {
    this.job = null;
    this.isEnabled = process.env.ENABLE_TASK_ROLLOVER === 'true';
    this.cronSchedule = process.env.TASK_ROLLOVER_SCHEDULE || '0 0 * * *'; // Default: midnight daily
  }

  /**
   * Initialize and start the task rollover cron job
   */
  start() {
    if (!this.isEnabled) {
      console.log('⏸️ Task rollover cron job is disabled (set ENABLE_TASK_ROLLOVER=true to enable)');
      return;
    }

    if (this.job) {
      console.log('⚠️ Task rollover cron job is already running');
      return;
    }

    // Validate cron expression
    if (!cron.validate(this.cronSchedule)) {
      console.error(`❌ Invalid cron schedule: ${this.cronSchedule}`);
      return;
    }

    console.log(`🕐 Starting task rollover cron job with schedule: ${this.cronSchedule}`);
    
    this.job = cron.schedule(this.cronSchedule, async () => {
      console.log('⏰ Task rollover cron job triggered at', new Date().toISOString());
      
      try {
        const result = await taskRolloverService.rolloverTasks({
          dryRun: false,
          userId: 'system-cron'
        });
        
        console.log('✅ Task rollover cron job completed:', result.message);
        console.log('   Stats:', result.stats);
        
        // Send notification to admins if tasks were rolled over
        if (result.stats.tasksRolledOver > 0) {
          this.notifyAdmins(result);
        }
      } catch (error) {
        console.error('❌ Task rollover cron job failed:', error);
        this.notifyAdmins({
          success: false,
          error: error.message
        });
      }
    }, {
      scheduled: true,
      timezone: process.env.TZ || 'America/New_York'
    });

    console.log('✅ Task rollover cron job started successfully');
    
    // Log next scheduled run
    this.logNextRun();
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('🛑 Task rollover cron job stopped');
    }
  }

  /**
   * Restart the cron job
   */
  restart() {
    this.stop();
    this.start();
  }

  /**
   * Run the task rollover immediately (for testing)
   */
  async runNow(options = {}) {
    console.log('🔄 Running task rollover manually...');
    try {
      const result = await taskRolloverService.rolloverTasks(options);
      console.log('✅ Manual task rollover completed:', result);
      return result;
    } catch (error) {
      console.error('❌ Manual task rollover failed:', error);
      throw error;
    }
  }

  /**
   * Get the status of the cron job
   */
  getStatus() {
    return {
      enabled: this.isEnabled,
      running: !!this.job,
      schedule: this.cronSchedule,
      timezone: process.env.TZ || 'America/New_York',
      nextRun: this.getNextRun()
    };
  }

  /**
   * Get the next scheduled run time
   */
  getNextRun() {
    if (!this.job) {
      return null;
    }

    // Parse cron expression to calculate next run
    const cronExpression = this.cronSchedule.split(' ');
    const now = new Date();
    
    // Simple calculation for daily midnight schedule
    if (this.cronSchedule === '0 0 * * *') {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);
      return tomorrow.toISOString();
    }

    // For other schedules, return a generic message
    return 'Next run based on schedule: ' + this.cronSchedule;
  }

  /**
   * Log the next scheduled run
   */
  logNextRun() {
    const nextRun = this.getNextRun();
    if (nextRun) {
      console.log(`📅 Next task rollover scheduled for: ${nextRun}`);
    }
  }

  /**
   * Notify admins about rollover results
   * @param {Object} result - Rollover result
   */
  async notifyAdmins(result) {
    // This could be extended to send emails or other notifications
    // For now, just log to console
    if (result.success) {
      console.log('📧 Admin notification: Task rollover completed successfully');
      console.log(`   - Tasks rolled over: ${result.stats?.tasksRolledOver || 0}`);
      console.log(`   - Tasks skipped: ${result.stats?.tasksSkipped || 0}`);
      console.log(`   - Errors: ${result.stats?.errors || 0}`);
    } else {
      console.error('📧 Admin notification: Task rollover failed');
      console.error(`   - Error: ${result.error}`);
    }

    // If Socket.IO is available, emit to admin dashboard
    if (global.io) {
      global.io.to('admin-dashboard').emit('task_rollover_complete', {
        timestamp: new Date().toISOString(),
        result: result
      });
    }
  }
}

// Create singleton instance
const taskRolloverCron = new TaskRolloverCron();

// Export the instance and a function to initialize it
module.exports = {
  taskRolloverCron,
  
  /**
   * Initialize the task rollover cron job
   * Call this from your main app.js file
   */
  initializeTaskRollover: () => {
    taskRolloverCron.start();
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, stopping task rollover cron job...');
      taskRolloverCron.stop();
    });
    
    process.on('SIGINT', () => {
      console.log('SIGINT received, stopping task rollover cron job...');
      taskRolloverCron.stop();
    });
  }
};