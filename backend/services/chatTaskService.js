const { createClient } = require('@supabase/supabase-js');
const TaskParser = require('../utils/taskParser');
const NotificationService = require('./notifications');
const AuditService = require('./audit');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class ChatTaskService {
  /**
   * Process a chat message for task creation
   */
  static async processMessage(message, exchangeId, sender) {
    try {
      // Parse message for task
      const taskData = await TaskParser.parseMessage(message.content, exchangeId, sender);
      
      if (!taskData) {
        return null; // No task found in message
      }

      console.log('📋 Task detected in message:', taskData);

      // Find assigned user
      let assignedUserId = null;
      if (taskData.assignedTo) {
        const assignedUser = await TaskParser.findUserByMention(taskData.assignedTo);
        if (assignedUser) {
          assignedUserId = assignedUser.id;
          console.log('👤 Assigned to user:', assignedUser.email);
        }
      }

      // Create the task
      const task = await this.createTask({
        ...taskData,
        assigned_to: assignedUserId,
        created_by: sender.id,
        message_id: message.id
      });

      // Send notifications
      await this.sendTaskNotifications(task, sender, assignedUserId);

      // Log audit
      await this.logTaskCreation(task, message, sender);

      return task;
    } catch (error) {
      console.error('Error processing chat task:', error);
      throw error;
    }
  }

  /**
   * Create task in database
   */
  static async createTask(taskData) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description,
        exchange_id: taskData.exchangeId,
        assigned_to: taskData.assigned_to,
        created_by: taskData.created_by,
        due_date: taskData.dueDate,
        priority: taskData.priority,
        category: taskData.category,
        status: 'pending',
        source: 'chat',
        source_message_id: taskData.message_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          created_from_chat: true,
          original_mentions: taskData.mentions,
          agent: 'ChatTaskService',
          chat_command: '@TASK'
        }
      })
      .select(`
        *,
        assignedUser:assigned_to(id, email, first_name, last_name),
        createdByUser:created_by(id, email, first_name, last_name),
        exchange:exchange_id(id, name)
      `)
      .single();

    if (error) {
      console.error('Error creating task:', error);
      throw error;
    }

    return data;
  }

  /**
   * Send notifications for task creation
   */
  static async sendTaskNotifications(task, creator, assignedUserId) {
    try {
      // Get assigned user details
      if (assignedUserId) {
        const { data: assignedUser } = await supabase
          .from('users')
          .select('email, first_name, last_name')
          .eq('id', assignedUserId)
          .single();

        if (assignedUser) {
          // Send email notification
          await NotificationService.sendEmail({
            to: assignedUser.email,
            subject: `New Task Assigned: ${task.title}`,
            template: 'task-assigned',
            data: {
              userName: `${assignedUser.first_name} ${assignedUser.last_name}`,
              taskTitle: task.title,
              taskDescription: task.description,
              dueDate: new Date(task.due_date).toLocaleDateString(),
              priority: task.priority,
              assignedBy: `${creator.first_name} ${creator.last_name}`,
              exchangeId: task.exchange_id
            }
          });

          // Create in-app notification
          await supabase
            .from('notifications')
            .insert({
              user_id: assignedUserId,
              type: 'task_assigned',
              title: 'New Task Assigned',
              message: `${creator.first_name} assigned you: "${task.title}"`,
              link: `/exchanges/${task.exchange_id}/tasks/${task.id}`,
              metadata: {
                task_id: task.id,
                exchange_id: task.exchange_id,
                assigned_by: creator.id
              }
            });
        }
      }

      // Notify exchange participants about new task
      await this.notifyExchangeParticipants(task, creator);

    } catch (error) {
      console.error('Error sending task notifications:', error);
      // Don't throw - notifications are not critical
    }
  }

  /**
   * Notify all exchange participants about new task
   */
  static async notifyExchangeParticipants(task, creator) {
    // Get exchange participants
    const { data: participants } = await supabase
      .from('exchange_participants')
      .select('user_id')
      .eq('exchange_id', task.exchange_id)
      .neq('user_id', creator.id); // Don't notify creator

    if (participants && participants.length > 0) {
      const notifications = participants.map(p => ({
        user_id: p.user_id,
        type: 'task_created',
        title: 'New Task Created',
        message: `${creator.first_name} created task: "${task.title}"`,
        link: `/exchanges/${task.exchange_id}/tasks/${task.id}`,
        metadata: {
          task_id: task.id,
          exchange_id: task.exchange_id,
          created_by: creator.id
        }
      }));

      await supabase
        .from('notifications')
        .insert(notifications);
    }
  }

  /**
   * Log task creation audit
   */
  static async logTaskCreation(task, message, creator) {
    await AuditService.log({
      action: 'TASK_CREATED_FROM_CHAT',
      entityType: 'task',
      entityId: task.id,
      userId: creator.id,
      details: {
        taskTitle: task.title,
        exchangeId: task.exchange_id,
        assignedTo: task.assigned_to,
        messageId: message.id,
        messageContent: message.content,
        priority: task.priority,
        dueDate: task.due_date
      }
    });
  }

  /**
   * Update existing message handlers to check for tasks
   */
  static async enhanceMessageHandler(messageData, sender) {
    // Check if message contains task
    const task = await this.processMessage(messageData, messageData.exchange_id, sender);
    
    if (task) {
      // Add task reference to message
      messageData.metadata = {
        ...messageData.metadata,
        created_task_id: task.id,
        has_task: true
      };

      // Update message with task reference
      await supabase
        .from('messages')
        .update({ metadata: messageData.metadata })
        .eq('id', messageData.id);
    }

    return task;
  }
}

module.exports = ChatTaskService;