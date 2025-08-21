const supabaseService = require('./supabase');
const AuditService = require('./audit');

class TaskRolloverService {
  constructor() {
    this.isRunning = false;
    this.lastRolloverDate = null;
  }

  /**
   * Roll over all incomplete tasks to the current date
   * @param {Object} options - Rollover options
   * @param {boolean} options.dryRun - If true, only preview changes without applying them
   * @param {string} options.userId - ID of user triggering the rollover (for audit logging)
   * @returns {Object} Result of the rollover operation
   */
  async rolloverTasks(options = {}) {
    const { dryRun = false, userId = 'system' } = options;
    
    if (this.isRunning) {
      console.log('⚠️ Task rollover already in progress, skipping...');
      return { 
        success: false, 
        message: 'Rollover already in progress' 
      };
    }

    this.isRunning = true;
    const startTime = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    console.log(`🔄 Starting task rollover for ${todayStr} (dry run: ${dryRun})`);
    
    try {
      // Get all incomplete tasks with due dates in the past
      // Note: metadata column is optional - will work without it
      const { data: overdueTasks, error: fetchError } = await supabaseService.client
        .from('tasks')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          exchange_id,
          assigned_to,
          due_date,
          created_at,
          exchange:exchange_id (
            id,
            exchange_number,
            status
          )
        `)
        .in('status', ['PENDING', 'IN_PROGRESS'])
        .lt('due_date', todayStr)
        .order('due_date', { ascending: true });

      if (fetchError) {
        console.error('❌ Error fetching overdue tasks:', fetchError);
        throw fetchError;
      }

      if (!overdueTasks || overdueTasks.length === 0) {
        console.log('✅ No overdue tasks to rollover');
        this.isRunning = false;
        return {
          success: true,
          message: 'No overdue tasks to rollover',
          stats: {
            tasksChecked: 0,
            tasksRolledOver: 0,
            errors: 0
          }
        };
      }

      console.log(`📋 Found ${overdueTasks.length} overdue tasks to rollover`);

      const results = {
        tasksChecked: overdueTasks.length,
        tasksRolledOver: 0,
        tasksSkipped: 0,
        errors: 0,
        rolledOverTasks: [],
        skippedTasks: [],
        failedTasks: []
      };

      // Process each overdue task
      for (const task of overdueTasks) {
        try {
          // Skip tasks from completed or terminated exchanges
          if (task.exchange?.status === 'COMPLETED' || task.exchange?.status === 'TERMINATED') {
            console.log(`⏭️ Skipping task "${task.title}" - exchange is ${task.exchange.status}`);
            results.tasksSkipped++;
            results.skippedTasks.push({
              id: task.id,
              title: task.title,
              reason: `Exchange is ${task.exchange.status}`
            });
            continue;
          }

          // Calculate how many days overdue
          const originalDueDate = new Date(task.due_date);
          const daysOverdue = Math.floor((today - originalDueDate) / (1000 * 60 * 60 * 24));

          // Prepare rollover metadata if column exists
          const rolloverMetadata = {
            rollover_history: [
              {
                original_due_date: task.due_date,
                new_due_date: todayStr,
                rolled_over_at: new Date().toISOString(),
                days_overdue: daysOverdue,
                rolled_over_by: userId
              }
            ],
            rollover_count: 1,
            last_rollover_date: new Date().toISOString()
          };

          if (!dryRun) {
            // Update the task with new due date (metadata is optional)
            const updateData = {
              due_date: todayStr,
              updated_at: new Date().toISOString()
            };
            
            // Try to update with metadata if supported
            const { data: updatedTask, error: updateError } = await supabaseService.client
              .from('tasks')
              .update(updateData)
              .eq('id', task.id)
              .select()
              .single();

            if (updateError) {
              console.error(`❌ Error rolling over task ${task.id}:`, updateError);
              results.errors++;
              results.failedTasks.push({
                id: task.id,
                title: task.title,
                error: updateError.message
              });
              continue;
            }

            // Log audit trail
            try {
              await AuditService.log({
                action: 'TASK_ROLLED_OVER',
                userId: userId,
                entityType: 'task',
                entityId: task.id,
                details: {
                  taskTitle: task.title,
                  exchangeId: task.exchange_id,
                  originalDueDate: task.due_date,
                  newDueDate: todayStr,
                  daysOverdue: daysOverdue,
                  rolloverCount: rolloverMetadata.rollover_count
                }
              });
            } catch (auditError) {
              console.error('⚠️ Audit logging failed for task rollover:', auditError);
            }

            console.log(`✅ Rolled over task "${task.title}" (${daysOverdue} days overdue)`);
            results.tasksRolledOver++;
            results.rolledOverTasks.push({
              id: task.id,
              title: task.title,
              originalDueDate: task.due_date,
              newDueDate: todayStr,
              daysOverdue: daysOverdue
            });

            // Emit real-time notification if Socket.IO is available
            if (global.io && task.exchange_id) {
              global.io.to(`exchange_${task.exchange_id}`).emit('task_rolled_over', {
                taskId: task.id,
                title: task.title,
                originalDueDate: task.due_date,
                newDueDate: todayStr,
                daysOverdue: daysOverdue,
                exchangeId: task.exchange_id
              });

              // Notify assigned user
              if (task.assigned_to) {
                global.io.to(`user_${task.assigned_to}`).emit('task_rolled_over', {
                  taskId: task.id,
                  title: task.title,
                  originalDueDate: task.due_date,
                  newDueDate: todayStr,
                  daysOverdue: daysOverdue,
                  exchangeId: task.exchange_id
                });
              }
            }
          } else {
            // Dry run - just log what would happen
            console.log(`🔍 [DRY RUN] Would rollover task "${task.title}" (${daysOverdue} days overdue)`);
            results.tasksRolledOver++;
            results.rolledOverTasks.push({
              id: task.id,
              title: task.title,
              originalDueDate: task.due_date,
              newDueDate: todayStr,
              daysOverdue: daysOverdue,
              dryRun: true
            });
          }
        } catch (taskError) {
          console.error(`❌ Error processing task ${task.id}:`, taskError);
          results.errors++;
          results.failedTasks.push({
            id: task.id,
            title: task.title,
            error: taskError.message
          });
        }
      }

      const endTime = new Date();
      const duration = (endTime - startTime) / 1000;

      const summary = {
        success: true,
        message: dryRun 
          ? `Dry run complete: Would rollover ${results.tasksRolledOver} tasks`
          : `Rolled over ${results.tasksRolledOver} tasks successfully`,
        stats: {
          tasksChecked: results.tasksChecked,
          tasksRolledOver: results.tasksRolledOver,
          tasksSkipped: results.tasksSkipped,
          errors: results.errors,
          duration: `${duration.toFixed(2)}s`
        },
        details: {
          rolledOverTasks: results.rolledOverTasks,
          skippedTasks: results.skippedTasks,
          failedTasks: results.failedTasks
        },
        executedAt: startTime.toISOString(),
        completedAt: endTime.toISOString()
      };

      // Log summary to audit if not a dry run
      if (!dryRun && results.tasksRolledOver > 0) {
        try {
          await AuditService.log({
            action: 'TASK_ROLLOVER_BATCH',
            userId: userId,
            entityType: 'system',
            entityId: 'task_rollover',
            details: summary
          });
        } catch (auditError) {
          console.error('⚠️ Failed to log rollover summary:', auditError);
        }
      }

      console.log(`✅ Task rollover completed in ${duration.toFixed(2)}s`);
      console.log(`   - Tasks checked: ${results.tasksChecked}`);
      console.log(`   - Tasks rolled over: ${results.tasksRolledOver}`);
      console.log(`   - Tasks skipped: ${results.tasksSkipped}`);
      console.log(`   - Errors: ${results.errors}`);

      this.lastRolloverDate = todayStr;
      this.isRunning = false;
      return summary;

    } catch (error) {
      console.error('❌ Task rollover failed:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Get rollover history for a specific task
   * @param {string} taskId - Task ID
   * @returns {Object} Rollover history for the task
   */
  async getTaskRolloverHistory(taskId) {
    try {
      const { data: task, error } = await supabaseService.client
        .from('tasks')
        .select('id, title, due_date')
        .eq('id', taskId)
        .single();

      if (error || !task) {
        throw new Error('Task not found');
      }

      // Return basic info when metadata column doesn't exist
      return {
        success: true,
        taskId: task.id,
        title: task.title,
        currentDueDate: task.due_date,
        rolloverCount: 0,
        rolloverHistory: [],
        note: 'Rollover history tracking requires metadata column in tasks table'
      };
    } catch (error) {
      console.error('Error fetching rollover history:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get rollover statistics for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Object} Rollover statistics
   */
  async getRolloverStatistics(startDate, endDate) {
    try {
      // Without metadata column, provide basic statistics
      const today = new Date().toISOString().split('T')[0];
      
      // Count overdue tasks
      const { data: overdueTasks, error: overdueError, count: overdueCount } = await supabaseService.client
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', ['PENDING', 'IN_PROGRESS'])
        .lt('due_date', today);

      if (overdueError) {
        throw overdueError;
      }

      // Count tasks due today
      const { count: todayCount } = await supabaseService.client
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .in('status', ['PENDING', 'IN_PROGRESS'])
        .eq('due_date', today);

      // Count completed tasks
      const { count: completedCount } = await supabaseService.client
        .from('tasks')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'COMPLETED');

      const stats = {
        currentOverdueTasks: overdueCount || 0,
        tasksDueToday: todayCount || 0,
        completedTasks: completedCount || 0,
        note: 'Detailed rollover statistics require metadata column in tasks table'
      };

      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Error getting rollover statistics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Manually trigger rollover for specific tasks
   * @param {Array} taskIds - Array of task IDs to rollover
   * @param {string} userId - ID of user triggering the rollover
   * @returns {Object} Result of the rollover operation
   */
  async rolloverSpecificTasks(taskIds, userId) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return {
        success: false,
        error: 'No task IDs provided'
      };
    }

    console.log(`🔄 Manually rolling over ${taskIds.length} tasks`);
    
    const today = new Date().toISOString().split('T')[0];
    const results = {
      success: [],
      failed: []
    };

    for (const taskId of taskIds) {
      try {
        const { data: task, error: fetchError } = await supabaseService.client
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();

        if (fetchError || !task) {
          results.failed.push({ taskId, error: 'Task not found' });
          continue;
        }

        // Update without metadata for now
        const { error: updateError } = await supabaseService.client
          .from('tasks')
          .update({
            due_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('id', taskId);

        if (updateError) {
          results.failed.push({ taskId, error: updateError.message });
        } else {
          results.success.push({ taskId, title: task.title });
          
          // Log audit trail
          await AuditService.log({
            action: 'TASK_MANUALLY_ROLLED_OVER',
            userId: userId,
            entityType: 'task',
            entityId: taskId,
            details: {
              taskTitle: task.title,
              originalDueDate: task.due_date,
              newDueDate: today
            }
          });
        }
      } catch (error) {
        results.failed.push({ taskId, error: error.message });
      }
    }

    return {
      success: results.failed.length === 0,
      message: `Rolled over ${results.success.length} tasks, ${results.failed.length} failed`,
      results
    };
  }
}

module.exports = new TaskRolloverService();