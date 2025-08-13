const NotificationService = require('./notifications');
const { createClient } = require('@supabase/supabase-js');

class AuditNotificationBridge {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    this.isListening = false;
    this.realtimeSubscription = null;
  }

  /**
   * Start listening to audit log changes
   */
  async startListening() {
    if (this.isListening) {
      console.log('🔊 Audit notification bridge already listening');
      return;
    }

    try {
      console.log('🔊 Starting audit notification bridge...');
      
      // Subscribe to real-time changes on audit_logs table
      this.realtimeSubscription = this.supabase
        .channel('audit_logs_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'audit_logs'
          },
          (payload) => {
            this.handleAuditLogEvent(payload.new);
          }
        )
        .subscribe();

      this.isListening = true;
      console.log('✅ Audit notification bridge started successfully');
    } catch (error) {
      console.error('❌ Failed to start audit notification bridge:', error);
    }
  }

  /**
   * Stop listening to audit log changes
   */
  async stopListening() {
    if (this.realtimeSubscription) {
      await this.supabase.removeChannel(this.realtimeSubscription);
      this.realtimeSubscription = null;
    }
    this.isListening = false;
    console.log('🔇 Audit notification bridge stopped');
  }

  /**
   * Handle new audit log events
   */
  async handleAuditLogEvent(auditLog) {
    try {
      console.log('📝 Processing audit log event:', auditLog.action);

      // Extract user ID from details since it's stored there
      const userId = auditLog.details?.userId;
      if (!userId) {
        console.log('⚠️ No userId found in audit log details');
        return;
      }

      switch (auditLog.action) {
        case 'EXCHANGE_CREATED':
          await this.handleExchangeCreated(auditLog);
          break;
        
        case 'EXCHANGE_UPDATED':
          await this.handleExchangeUpdated(auditLog);
          break;
        
        case 'USER_INVITED_TO_EXCHANGE':
          await this.handleUserInvited(auditLog);
          break;
        
        case 'DOCUMENT_UPLOADED':
          await this.handleDocumentUploaded(auditLog);
          break;
        
        case 'TASK_ASSIGNED':
          await this.handleTaskAssigned(auditLog);
          break;
        
        case 'TASK_COMPLETED':
          await this.handleTaskCompleted(auditLog);
          break;
        
        case 'MESSAGE_SENT':
          await this.handleMessageSent(auditLog);
          break;
        
        case 'DOCUMENT_DOWNLOADED':
          await this.handleDocumentDownloaded(auditLog);
          break;
        
        case 'EXCHANGE_STATUS_CHANGED':
          await this.handleExchangeStatusChanged(auditLog);
          break;
        
        case 'USER_LOGIN':
          await this.handleUserLogin(auditLog);
          break;
        
        case 'USER_LOGOUT':
          await this.handleUserLogout(auditLog);
          break;
        
        default:
          console.log('📝 No notification handler for action:', auditLog.action);
          // Send generic activity notification to the user
          await this.handleGenericActivity(auditLog);
      }
    } catch (error) {
      console.error('❌ Error handling audit log event:', error);
    }
  }

  /**
   * Handle exchange created events
   */
  async handleExchangeCreated(auditLog) {
    try {
      const details = auditLog.details || {};
      const exchangeId = auditLog.entity_id;
      const userId = details.userId;

      // Get exchange details
      const { data: exchange } = await this.supabase
        .from('exchanges')
        .select('*')
        .eq('id', exchangeId)
        .single();

      if (!exchange) {
        console.log('⚠️ Exchange not found for notification:', exchangeId);
        return;
      }

      // Get users who should be notified (participants, coordinator, etc.)
      const usersToNotify = await this.getUsersToNotifyForExchange(exchangeId);

      // Send notifications
      for (const user of usersToNotify) {
        if (user.id !== userId) { // Don't notify the user who created it
          await NotificationService.createNotification({
            userId: user.id,
            type: 'exchange',
            title: 'New Exchange Created',
            message: `A new exchange "${exchange.exchange_number || 'Exchange'}" has been created.`,
            data: {
              exchangeId: exchangeId,
              action: 'EXCHANGE_CREATED',
              createdBy: userId
            },
            priority: 'medium'
          });
        }
      }

      console.log(`✅ Sent exchange created notifications to ${usersToNotify.length} users`);
    } catch (error) {
      console.error('❌ Error handling exchange created event:', error);
    }
  }

  /**
   * Handle exchange updated events
   */
  async handleExchangeUpdated(auditLog) {
    try {
      const details = auditLog.details || {};
      const exchangeId = auditLog.entity_id;
      const userId = details.userId;

      // Get exchange details
      const { data: exchange } = await this.supabase
        .from('exchanges')
        .select('*')
        .eq('id', exchangeId)
        .single();

      if (!exchange) {
        console.log('⚠️ Exchange not found for notification:', exchangeId);
        return;
      }

      // Get users who should be notified
      const usersToNotify = await this.getUsersToNotifyForExchange(exchangeId);

      // Send notifications
      for (const user of usersToNotify) {
        if (user.id !== userId) { // Don't notify the user who updated it
          await NotificationService.createNotification({
            userId: user.id,
            type: 'exchange',
            title: 'Exchange Updated',
            message: `Exchange "${exchange.exchange_number || 'Exchange'}" has been updated.`,
            data: {
              exchangeId: exchangeId,
              action: 'EXCHANGE_UPDATED',
              updatedBy: userId,
              changes: details.changes || {}
            },
            priority: 'low'
          });
        }
      }

      console.log(`✅ Sent exchange updated notifications to ${usersToNotify.length} users`);
    } catch (error) {
      console.error('❌ Error handling exchange updated event:', error);
    }
  }

  /**
   * Handle user invited events
   */
  async handleUserInvited(auditLog) {
    try {
      const details = auditLog.details || {};
      const exchangeId = auditLog.entity_id;
      const invitedUserId = details.invitedUserId;
      const invitedByUserId = details.userId;

      if (!invitedUserId) {
        console.log('⚠️ No invited user ID in audit log details');
        return;
      }

      // Get exchange details
      const { data: exchange } = await this.supabase
        .from('exchanges')
        .select('*')
        .eq('id', exchangeId)
        .single();

      // Send notification to invited user
      await NotificationService.createNotification({
        userId: invitedUserId,
        type: 'invitation',
        title: 'Exchange Invitation',
        message: `You have been invited to participate in exchange "${exchange?.exchange_number || 'Exchange'}".`,
        data: {
          exchangeId: exchangeId,
          action: 'USER_INVITED_TO_EXCHANGE',
          invitedBy: invitedByUserId
        },
        priority: 'high'
      });

      console.log(`✅ Sent invitation notification to user ${invitedUserId}`);
    } catch (error) {
      console.error('❌ Error handling user invited event:', error);
    }
  }

  /**
   * Handle document uploaded events
   */
  async handleDocumentUploaded(auditLog) {
    try {
      const details = auditLog.details || {};
      const exchangeId = auditLog.entity_id;
      const documentId = details.documentId;
      const uploadedByUserId = details.userId;

      // Get exchange details
      const { data: exchange } = await this.supabase
        .from('exchanges')
        .select('*')
        .eq('id', exchangeId)
        .single();

      // Get document details
      const { data: document } = await this.supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      // Get users who should be notified
      const usersToNotify = await this.getUsersToNotifyForExchange(exchangeId);

      // Send notifications
      for (const user of usersToNotify) {
        if (user.id !== uploadedByUserId) { // Don't notify the user who uploaded it
          await NotificationService.createNotification({
            userId: user.id,
            type: 'document',
            title: 'New Document Uploaded',
            message: `A new document "${document?.original_filename || 'Document'}" has been uploaded to exchange "${exchange?.exchange_number || 'Exchange'}".`,
            data: {
              exchangeId: exchangeId,
              documentId: documentId,
              action: 'DOCUMENT_UPLOADED',
              uploadedBy: uploadedByUserId
            },
            priority: 'medium'
          });
        }
      }

      console.log(`✅ Sent document uploaded notifications to ${usersToNotify.length} users`);
    } catch (error) {
      console.error('❌ Error handling document uploaded event:', error);
    }
  }

  /**
   * Handle task assigned events
   */
  async handleTaskAssigned(auditLog) {
    try {
      const details = auditLog.details || {};
      const taskId = auditLog.entity_id;
      const assignedToUserId = details.assignedToUserId;
      const assignedByUserId = details.userId;

      if (!assignedToUserId) {
        console.log('⚠️ No assigned user ID in audit log details');
        return;
      }

      // Get task details
      const { data: task } = await this.supabase
        .from('tasks')
        .select('*, exchanges!inner(*)')
        .eq('id', taskId)
        .single();

      if (!task) {
        console.log('⚠️ Task not found for notification:', taskId);
        return;
      }

      // Send notification to assigned user
      await NotificationService.createNotification({
        userId: assignedToUserId,
        type: 'task',
        title: 'New Task Assigned',
        message: `You have been assigned a new task: "${task.title}" in exchange "${task.exchanges.exchange_number || 'Exchange'}".`,
        data: {
          taskId: taskId,
          exchangeId: task.exchange_id,
          action: 'TASK_ASSIGNED',
          assignedBy: assignedByUserId
        },
        priority: 'high'
      });

      console.log(`✅ Sent task assignment notification to user ${assignedToUserId}`);
    } catch (error) {
      console.error('❌ Error handling task assigned event:', error);
    }
  }

  /**
   * Handle task completed events
   */
  async handleTaskCompleted(auditLog) {
    try {
      const details = auditLog.details || {};
      const taskId = auditLog.entity_id;
      const completedByUserId = details.userId;

      // Get task details
      const { data: task } = await this.supabase
        .from('tasks')
        .select('*, exchanges!inner(*)')
        .eq('id', taskId)
        .single();

      if (!task) {
        console.log('⚠️ Task not found for notification:', taskId);
        return;
      }

      // Get users who should be notified (coordinator, exchange participants)
      const usersToNotify = await this.getUsersToNotifyForExchange(task.exchange_id);

      // Send notifications
      for (const user of usersToNotify) {
        if (user.id !== completedByUserId) { // Don't notify the user who completed it
          await NotificationService.createNotification({
            userId: user.id,
            type: 'task',
            title: 'Task Completed',
            message: `Task "${task.title}" has been completed in exchange "${task.exchanges.exchange_number || 'Exchange'}".`,
            data: {
              taskId: taskId,
              exchangeId: task.exchange_id,
              action: 'TASK_COMPLETED',
              completedBy: completedByUserId
            },
            priority: 'medium'
          });
        }
      }

      console.log(`✅ Sent task completed notifications to ${usersToNotify.length} users`);
    } catch (error) {
      console.error('❌ Error handling task completed event:', error);
    }
  }

  /**
   * Handle message sent events
   */
  async handleMessageSent(auditLog) {
    try {
      const details = auditLog.details || {};
      const exchangeId = auditLog.entity_id;
      const messageId = details.messageId;
      const sentByUserId = details.userId;

      // Get exchange details
      const { data: exchange } = await this.supabase
        .from('exchanges')
        .select('*')
        .eq('id', exchangeId)
        .single();

      // Get users who should be notified
      const usersToNotify = await this.getUsersToNotifyForExchange(exchangeId);

      // Send notifications
      for (const user of usersToNotify) {
        if (user.id !== sentByUserId) { // Don't notify the user who sent it
          await NotificationService.createNotification({
            userId: user.id,
            type: 'message',
            title: 'New Message',
            message: `A new message has been sent in exchange "${exchange?.exchange_number || 'Exchange'}".`,
            data: {
              exchangeId: exchangeId,
              messageId: messageId,
              action: 'MESSAGE_SENT',
              sentBy: sentByUserId
            },
            priority: 'low'
          });
        }
      }

      console.log(`✅ Sent message notifications to ${usersToNotify.length} users`);
    } catch (error) {
      console.error('❌ Error handling message sent event:', error);
    }
  }

  /**
   * Handle document downloaded events
   */
  async handleDocumentDownloaded(auditLog) {
    try {
      const details = auditLog.details || {};
      const documentId = auditLog.entity_id;
      const downloadedByUserId = details.userId;

      // Get document details
      const { data: document } = await this.supabase
        .from('documents')
        .select('*, exchanges!inner(*)')
        .eq('id', documentId)
        .single();

      if (!document) {
        console.log('⚠️ Document not found for notification:', documentId);
        return;
      }

      // Get users who should be notified (document owner, exchange coordinator)
      const usersToNotify = await this.getUsersToNotifyForExchange(document.exchange_id);

      // Send notifications to document owner and coordinator
      for (const user of usersToNotify) {
        if (user.id !== downloadedByUserId && 
            (user.id === document.uploaded_by || user.role === 'coordinator')) {
          await NotificationService.createNotification({
            userId: user.id,
            type: 'document',
            title: 'Document Downloaded',
            message: `Document "${document.original_filename}" has been downloaded in exchange "${document.exchanges.exchange_number || 'Exchange'}".`,
            data: {
              documentId: documentId,
              exchangeId: document.exchange_id,
              action: 'DOCUMENT_DOWNLOADED',
              downloadedBy: downloadedByUserId
            },
            priority: 'low'
          });
        }
      }

      console.log(`✅ Sent document downloaded notifications`);
    } catch (error) {
      console.error('❌ Error handling document downloaded event:', error);
    }
  }

  /**
   * Handle exchange status changed events
   */
  async handleExchangeStatusChanged(auditLog) {
    try {
      const details = auditLog.details || {};
      const exchangeId = auditLog.entity_id;
      const changedByUserId = details.userId;
      const oldStatus = details.oldStatus;
      const newStatus = details.newStatus;

      // Get exchange details
      const { data: exchange } = await this.supabase
        .from('exchanges')
        .select('*')
        .eq('id', exchangeId)
        .single();

      // Get users who should be notified
      const usersToNotify = await this.getUsersToNotifyForExchange(exchangeId);

      // Send notifications
      for (const user of usersToNotify) {
        if (user.id !== changedByUserId) { // Don't notify the user who changed it
          await NotificationService.createNotification({
            userId: user.id,
            type: 'exchange',
            title: 'Exchange Status Changed',
            message: `Exchange "${exchange?.exchange_number || 'Exchange'}" status changed from ${oldStatus} to ${newStatus}.`,
            data: {
              exchangeId: exchangeId,
              action: 'EXCHANGE_STATUS_CHANGED',
              changedBy: changedByUserId,
              oldStatus: oldStatus,
              newStatus: newStatus
            },
            priority: 'medium'
          });
        }
      }

      console.log(`✅ Sent exchange status change notifications to ${usersToNotify.length} users`);
    } catch (error) {
      console.error('❌ Error handling exchange status changed event:', error);
    }
  }

  /**
   * Handle user login events
   */
  async handleUserLogin(auditLog) {
    try {
      const details = auditLog.details || {};
      const userId = details.userId;

      // Get user details
      const { data: user } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!user) {
        console.log('⚠️ User not found for login notification:', userId);
        return;
      }

      // Send notification to admins about user login
      const { data: admins } = await this.supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      for (const admin of admins || []) {
        if (admin.id !== userId) { // Don't notify the user who logged in
          await NotificationService.createNotification({
            userId: admin.id,
            type: 'security',
            title: 'User Login',
            message: `User ${user.email} has logged in.`,
            data: {
              action: 'USER_LOGIN',
              loggedInUser: userId,
              ipAddress: details.ipAddress
            },
            priority: 'low'
          });
        }
      }

      console.log(`✅ Sent login notifications to ${admins?.length || 0} admins`);
    } catch (error) {
      console.error('❌ Error handling user login event:', error);
    }
  }

  /**
   * Handle user logout events
   */
  async handleUserLogout(auditLog) {
    try {
      const details = auditLog.details || {};
      const userId = details.userId;

      // Get user details
      const { data: user } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!user) {
        console.log('⚠️ User not found for logout notification:', userId);
        return;
      }

      // Send notification to admins about user logout
      const { data: admins } = await this.supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      for (const admin of admins || []) {
        if (admin.id !== userId) { // Don't notify the user who logged out
          await NotificationService.createNotification({
            userId: admin.id,
            type: 'security',
            title: 'User Logout',
            message: `User ${user.email} has logged out.`,
            data: {
              action: 'USER_LOGOUT',
              loggedOutUser: userId,
              ipAddress: details.ipAddress
            },
            priority: 'low'
          });
        }
      }

      console.log(`✅ Sent logout notifications to ${admins?.length || 0} admins`);
    } catch (error) {
      console.error('❌ Error handling user logout event:', error);
    }
  }

  /**
   * Handle generic activity events
   */
  async handleGenericActivity(auditLog) {
    try {
      const details = auditLog.details || {};
      const userId = details.userId;

      // Get user details
      const { data: user } = await this.supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (!user) {
        console.log('⚠️ User not found for generic activity notification:', userId);
        return;
      }

      // Send notification to admins about generic activity
      const { data: admins } = await this.supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      for (const admin of admins || []) {
        if (admin.id !== userId) { // Don't notify the user who performed the action
          await NotificationService.createNotification({
            userId: admin.id,
            type: 'audit',
            title: 'User Activity',
            message: `User ${user.email} performed action: ${auditLog.action}`,
            data: {
              action: auditLog.action,
              entityType: auditLog.entity_type,
              entityId: auditLog.entity_id,
              performedBy: userId
            },
            priority: 'low'
          });
        }
      }

      console.log(`✅ Sent generic activity notifications to ${admins?.length || 0} admins`);
    } catch (error) {
      console.error('❌ Error handling generic activity event:', error);
    }
  }

  /**
   * Get users who should be notified for an exchange
   */
  async getUsersToNotifyForExchange(exchangeId) {
    try {
      const usersToNotify = [];

      // Get exchange participants
      const { data: participants } = await this.supabase
        .from('exchange_participants')
        .select('user_id')
        .eq('exchange_id', exchangeId);

      if (participants) {
        for (const participant of participants) {
          const { data: user } = await this.supabase
            .from('users')
            .select('id, role')
            .eq('id', participant.user_id)
            .single();
          
          if (user) {
            usersToNotify.push(user);
          }
        }
      }

      // Get exchange coordinator
      const { data: exchange } = await this.supabase
        .from('exchanges')
        .select('coordinator_id')
        .eq('id', exchangeId)
        .single();

      if (exchange?.coordinator_id) {
        const { data: coordinator } = await this.supabase
          .from('users')
          .select('id, role')
          .eq('id', exchange.coordinator_id)
          .single();
        
        if (coordinator && !usersToNotify.find(u => u.id === coordinator.id)) {
          usersToNotify.push(coordinator);
        }
      }

      return usersToNotify;
    } catch (error) {
      console.error('❌ Error getting users to notify for exchange:', error);
      return [];
    }
  }

  /**
   * Manually trigger notification for a specific audit log
   */
  async triggerNotificationForAuditLog(auditLogId) {
    try {
      const { data: auditLog, error } = await this.supabase
        .from('audit_logs')
        .select('*')
        .eq('id', auditLogId)
        .single();

      if (error || !auditLog) {
        console.error('❌ Failed to fetch audit log:', error);
        return;
      }

      await this.handleAuditLogEvent(auditLog);
    } catch (error) {
      console.error('❌ Error triggering notification for audit log:', error);
    }
  }
}

module.exports = new AuditNotificationBridge();





