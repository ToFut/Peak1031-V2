const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const notificationFilterService = require('./notificationFilterService');
require('dotenv').config();

class NotificationService {
  constructor() {
    // Initialize SendGrid only if valid API key is provided
    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.sendGridEnabled = true;
    } else {
      this.sendGridEnabled = false;
      console.log('⚠️ SendGrid not configured - email notifications disabled');
    }
    
    // Initialize Twilio only if valid credentials are provided
    if (process.env.TWILIO_ACCOUNT_SID && 
        process.env.TWILIO_AUTH_TOKEN && 
        process.env.TWILIO_ACCOUNT_SID.startsWith('AC')) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
      this.twilioEnabled = true;
    } else {
      this.twilioEnabled = false;
      console.log('⚠️ Twilio not configured - SMS notifications disabled');
    }
    
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@peak1031.com';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'Peak 1031 Platform';
    this.fromPhone = process.env.TWILIO_FROM_NUMBER;
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  /**
   * Create a notification with modern features and history tracking
   */
  async createNotification(notificationData) {
    try {
      const {
        userId,
        type = 'system',
        category = 'system',
        title,
        message,
        priority = 'medium',
        actionUrl,
        actionLabel,
        metadata = {},
        expiresAt,
        exchangeId,
        sourceUserId,
        organizationId,
        templateName
      } = notificationData;

      // If template is provided, use it to generate notification content
      let finalTitle = title;
      let finalMessage = message;
      let finalActionUrl = actionUrl;
      let finalActionLabel = actionLabel;

      if (templateName) {
        const template = await this.getNotificationTemplate(templateName);
        if (template) {
          finalTitle = this.processTemplate(template.title_template, metadata);
          finalMessage = this.processTemplate(template.message_template, metadata);
          finalActionUrl = template.action_url_template ? this.processTemplate(template.action_url_template, metadata) : actionUrl;
          finalActionLabel = template.action_label || actionLabel;
        }
      }

      // Get user notification preferences
      const userPreferences = await this.getUserNotificationPreferences(userId, category);
      
      // Check if notification should be sent based on user preferences
      if (!userPreferences || !userPreferences.in_app_enabled) {
        console.log(`🔕 In-app notifications disabled for user ${userId} - category: ${category}`);
        return { success: true, filtered: true };
      }

      // Create database notification with enhanced structure
      const databaseService = require('./database');
      const notification = await databaseService.createNotification({
        user_id: userId,
        type,
        category,
        title: finalTitle,
        message: finalMessage,
        priority,
        status: 'unread',
        action_url: finalActionUrl,
        action_label: finalActionLabel,
        metadata: JSON.stringify(metadata),
        expires_at: expiresAt,
        related_exchange_id: exchangeId,
        source_user_id: sourceUserId,
        organization_id: organizationId,
        is_read: false,
        created_at: new Date().toISOString()
      });

      // Log notification creation activity
      await this.logNotificationActivity(notification.id, userId, 'sent', metadata);

      // Send notifications through enabled channels based on preferences
      const results = await this.sendNotificationThroughChannels(
        userId,
        notification,
        userPreferences
      );

      // Emit real-time notification via Socket.IO
      await this.emitRealTimeNotification(userId, notification);

      return {
        success: true,
        notification,
        channels: results
      };

    } catch (error) {
      console.error('❌ Error creating notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send notification through multiple channels based on user preferences
   */
  async sendNotificationThroughChannels(userId, notification, userPreferences) {
    const results = {};

    // Check each channel preference and send accordingly
    if (userPreferences.email_enabled) {
      try {
        results.email = await this.sendEmailNotification(userId, notification, userPreferences);
      } catch (error) {
        console.error(`❌ Error sending email notification:`, error);
        results.email = { success: false, error: error.message };
      }
    }

    if (userPreferences.sms_enabled) {
      try {
        results.sms = await this.sendSMSNotification(userId, notification, userPreferences);
      } catch (error) {
        console.error(`❌ Error sending SMS notification:`, error);
        results.sms = { success: false, error: error.message };
      }
    }

    if (userPreferences.browser_enabled) {
      try {
        results.browser = await this.sendBrowserNotification(userId, notification, userPreferences);
      } catch (error) {
        console.error(`❌ Error sending browser notification:`, error);
        results.browser = { success: false, error: error.message };
      }
    }

    // In-app notifications are always stored in database
    results.inApp = { success: true };

    return results;
  }

  /**
   * Get user notification preferences from database
   */
  async getUserNotificationPreferences(userId, category) {
    try {
      const databaseService = require('./database');
      const preferences = await databaseService.getUserNotificationPreferences(userId, category);
      
      // Return default preferences if none found
      if (!preferences) {
        return {
          email_enabled: true,
          sms_enabled: false,
          in_app_enabled: true,
          browser_enabled: true,
          sound_enabled: true,
          desktop_enabled: false,
          frequency: 'immediate'
        };
      }
      
      return preferences;
    } catch (error) {
      console.error('Error getting user notification preferences:', error);
      // Return safe defaults
      return {
        email_enabled: false,
        sms_enabled: false,
        in_app_enabled: true,
        browser_enabled: false,
        sound_enabled: false,
        desktop_enabled: false,
        frequency: 'immediate'
      };
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(userId, notification, userSettings) {
    if (!this.sendGridEnabled) {
      return { success: false, error: 'SendGrid not configured' };
    }

    try {
      // Get user email
      const databaseService = require('./database');
      const user = await databaseService.getUserById(userId);
      
      if (!user || !user.email) {
        return { success: false, error: 'User email not found' };
      }

      const msg = {
        to: user.email,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: notification.title,
        html: this.generateEmailTemplate(notification, userSettings)
      };

      await sgMail.send(msg);
      console.log(`📧 Email notification sent to ${user.email}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending email notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(userId, notification, userSettings) {
    if (!this.twilioEnabled) {
      return { success: false, error: 'Twilio not configured' };
    }

    try {
      // Get user phone number
      const databaseService = require('./database');
      const user = await databaseService.getUserById(userId);
      
      if (!user || !user.phone) {
        return { success: false, error: 'User phone number not found' };
      }

      await this.twilioClient.messages.create({
        body: `${notification.title}: ${notification.message}`,
        from: this.fromPhone,
        to: user.phone
      });

      console.log(`📱 SMS notification sent to ${user.phone}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending SMS notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send in-app notification (Socket.IO)
   */
  async sendInAppNotification(userId, notification, userSettings) {
    try {
      // This would typically be handled by Socket.IO
      // For now, we'll just log it
      console.log(`🔔 In-app notification prepared for user ${userId}: ${notification.title}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending in-app notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send browser notification
   */
  async sendBrowserNotification(userId, notification, userSettings) {
    try {
      // Browser notifications are handled on the frontend
      // This is just a placeholder for the backend
      console.log(`🌐 Browser notification prepared for user ${userId}: ${notification.title}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error sending browser notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate email template
   */
  generateEmailTemplate(notification, userSettings) {
    const priorityColor = {
      high: '#dc2626',
      medium: '#f59e0b',
      low: '#6b7280'
    };

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
          <h1>Peak 1031 Notification</h1>
        </div>
        
        <div style="padding: 30px;">
          <div style="border-left: 4px solid ${priorityColor[notification.priority] || '#6b7280'}; padding-left: 20px; margin-bottom: 20px;">
            <h2 style="color: ${priorityColor[notification.priority] || '#6b7280'}; margin-top: 0;">
              ${notification.title}
            </h2>
            <p style="font-size: 16px; line-height: 1.6; color: #374151;">
              ${notification.message}
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${this.baseUrl}/dashboard" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              View in Dashboard
            </a>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <h3 style="margin-top: 0; color: #374151;">Notification Settings</h3>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 0;">
              You can manage your notification preferences in your account settings.
            </p>
          </div>
        </div>
        
        <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin: 0;">
            This notification was sent by the Peak 1031 Platform.
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(email, firstName, tempPassword = null) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping welcome email to:', email);
      return { success: true, skipped: true };
    }

    try {
      const subject = 'Welcome to Peak 1031 Platform';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1>Welcome to Peak 1031</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2>Hello ${firstName}!</h2>
            
            <p>Welcome to the Peak 1031 Exchange Management Platform. Your account has been created successfully.</p>
            
            ${tempPassword ? `
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Your Login Details:</h3>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> ${tempPassword}</p>
                <p style="color: #dc2626;"><strong>Important:</strong> Please change your password after your first login.</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.baseUrl}/login" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Access Your Account
              </a>
            </div>
            
            <h3>What's Next?</h3>
            <ul>
              <li>Complete your profile setup</li>
              <li>Review your assigned exchanges</li>
              <li>Configure your notification preferences</li>
              <li>Enable two-factor authentication for enhanced security</li>
            </ul>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br>The Peak 1031 Team</p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              This email was sent to ${email}. If you didn't expect this email, please ignore it.
            </p>
          </div>
        </div>
      `;

      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject,
        html
      };

      await sgMail.send(msg);
      console.log(`📧 Welcome email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, resetToken) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping password reset email to:', email);
      return { success: true, skipped: true };
    }

    try {
      const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;
      
      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: 'Reset Your Peak 1031 Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
              <h1>Password Reset Request</h1>
            </div>
            
            <div style="padding: 30px;">
              <p>You requested a password reset for your Peak 1031 account.</p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <p><strong>Important:</strong> This link will expire in 1 hour for security reasons.</p>
              
              <p>If you didn't request this password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px;">
                This email was sent to ${email}. If you didn't expect this email, please ignore it.
              </p>
            </div>
          </div>
        `
      };

      await sgMail.send(msg);
      console.log(`📧 Password reset email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send two-factor authentication code via SMS
   */
  async sendTwoFactorCode(phoneNumber, code) {
    if (!this.twilioEnabled) {
      console.log('📱 Twilio not enabled - skipping 2FA SMS to:', phoneNumber);
      return { success: true, skipped: true };
    }

    try {
      await this.twilioClient.messages.create({
        body: `Your Peak 1031 verification code is: ${code}. This code will expire in 10 minutes.`,
        from: this.fromPhone,
        to: phoneNumber
      });

      console.log(`📱 2FA code sent to ${phoneNumber}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending 2FA code:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get notification template by name
   */
  async getNotificationTemplate(templateName) {
    try {
      const databaseService = require('./database');
      return await databaseService.getNotificationTemplate(templateName);
    } catch (error) {
      console.error('Error getting notification template:', error);
      return null;
    }
  }

  /**
   * Process template with variables
   */
  processTemplate(template, variables) {
    if (!template || !variables) return template;
    
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] || match;
    });
  }

  /**
   * Log notification activity for audit trail
   */
  async logNotificationActivity(notificationId, userId, action, metadata = {}) {
    try {
      const databaseService = require('./database');
      await databaseService.createNotificationActivity({
        notification_id: notificationId,
        user_id: userId,
        action,
        metadata: JSON.stringify(metadata),
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging notification activity:', error);
    }
  }

  /**
   * Emit real-time notification via Socket.IO
   */
  async emitRealTimeNotification(userId, notification) {
    try {
      // Get Socket.IO instance
      const socketService = require('./socketService');
      if (socketService && socketService.emitToUser) {
        socketService.emitToUser(userId, 'new_notification', {
          id: notification.id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          category: notification.category,
          priority: notification.priority,
          actionUrl: notification.action_url,
          actionLabel: notification.action_label,
          timestamp: notification.created_at,
          read: false
        });
        
        // Also emit updated unread count
        const unreadCount = await this.getUnreadNotificationCount(userId);
        socketService.emitToUser(userId, 'notification_count', { unread: unreadCount });
      }
    } catch (error) {
      console.error('Error emitting real-time notification:', error);
    }
  }

  /**
   * Get unread notification count for user
   */
  async getUnreadNotificationCount(userId) {
    try {
      const databaseService = require('./database');
      return await databaseService.getUnreadNotificationCount(userId);
    } catch (error) {
      console.error('Error getting unread notification count:', error);
      return 0;
    }
  }

  /**
   * Get notification history for user with pagination
   */
  async getNotificationHistory(userId, options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        category,
        status = 'all',
        startDate,
        endDate
      } = options;

      const databaseService = require('./database');
      return await databaseService.getNotificationHistory(userId, {
        limit,
        offset,
        category,
        status,
        startDate,
        endDate
      });
    } catch (error) {
      console.error('Error getting notification history:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(notificationId, userId) {
    try {
      const databaseService = require('./database');
      const success = await databaseService.markNotificationAsRead(notificationId, userId);
      
      if (success) {
        // Log the activity
        await this.logNotificationActivity(notificationId, userId, 'read');
        
        // Emit updated count via Socket.IO
        await this.emitUpdatedNotificationCount(userId);
      }
      
      return success;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllNotificationsAsRead(userId) {
    try {
      const databaseService = require('./database');
      const count = await databaseService.markAllNotificationsAsRead(userId);
      
      if (count > 0) {
        // Emit updated count via Socket.IO
        await this.emitUpdatedNotificationCount(userId);
      }
      
      return count;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      return 0;
    }
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId, userId) {
    try {
      const databaseService = require('./database');
      const success = await databaseService.archiveNotification(notificationId, userId);
      
      if (success) {
        await this.logNotificationActivity(notificationId, userId, 'archived');
        await this.emitUpdatedNotificationCount(userId);
      }
      
      return success;
    } catch (error) {
      console.error('Error archiving notification:', error);
      return false;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId, userId) {
    try {
      const databaseService = require('./database');
      const success = await databaseService.deleteNotification(notificationId, userId);
      
      if (success) {
        await this.logNotificationActivity(notificationId, userId, 'deleted');
        await this.emitUpdatedNotificationCount(userId);
      }
      
      return success;
    } catch (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
  }

  /**
   * Emit updated notification count via Socket.IO
   */
  async emitUpdatedNotificationCount(userId) {
    try {
      const socketService = require('./socketService');
      if (socketService && socketService.emitToUser) {
        const unreadCount = await this.getUnreadNotificationCount(userId);
        socketService.emitToUser(userId, 'notification_count', { unread: unreadCount });
      }
    } catch (error) {
      console.error('Error emitting updated notification count:', error);
    }
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(userId, category, preferences) {
    try {
      const databaseService = require('./database');
      return await databaseService.updateNotificationPreferences(userId, category, preferences);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      return false;
    }
  }

  /**
   * Get all notification preferences for user
   */
  async getAllNotificationPreferences(userId) {
    try {
      const databaseService = require('./database');
      return await databaseService.getAllNotificationPreferences(userId);
    } catch (error) {
      console.error('Error getting all notification preferences:', error);
      return [];
    }
  }

  /**
   * Create notification from template with variables
   */
  async createNotificationFromTemplate(templateName, userId, variables = {}) {
    try {
      const template = await this.getNotificationTemplate(templateName);
      if (!template) {
        throw new Error(`Template ${templateName} not found`);
      }

      return await this.createNotification({
        userId,
        templateName,
        category: template.category,
        priority: template.priority,
        metadata: variables,
        organizationId: template.organization_id
      });
    } catch (error) {
      console.error('Error creating notification from template:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send assignment approval email with token link
   */
  async sendAssignmentApprovalEmail(email, assignmentData) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping assignment approval email to:', email);
      return { success: true, skipped: true };
    }

    try {
      const { 
        firstName, 
        lastName, 
        role, 
        exchangeName, 
        assignedByName, 
        approvalToken,
        exchangeId 
      } = assignmentData;
      
      const approvalUrl = `${this.baseUrl}/approve-assignment/${approvalToken}`;
      const displayName = firstName && lastName ? `${firstName} ${lastName}` : email.split('@')[0];
      
      const subject = `Assignment Approval Required - ${exchangeName}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1>Assignment Approval Required</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2>Hello ${displayName}!</h2>
            
            <p>You have been assigned as a <strong>${role}</strong> to the following 1031 exchange:</p>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Exchange Details:</h3>
              <p><strong>Exchange:</strong> ${exchangeName}</p>
              <p><strong>Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
              <p><strong>Assigned by:</strong> ${assignedByName}</p>
            </div>
            
            <p><strong>Action Required:</strong> Please review and approve this assignment to begin participating in this exchange.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${approvalUrl}" 
                 style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Review & Approve Assignment
              </a>
            </div>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;"><strong>Important:</strong> This approval link will expire in 7 days for security reasons.</p>
            </div>
            
            <h3>What happens next?</h3>
            <ul>
              <li>Click the approval link above to review the assignment details</li>
              <li>Confirm or decline the assignment</li>
              <li>If approved, you'll gain access to exchange documents and communications</li>
              <li>You'll receive further instructions for participating in the exchange</li>
            </ul>
            
            <p>If you have any questions or concerns about this assignment, please contact the administrator who assigned you.</p>
            
            <p>Best regards,<br>The Peak 1031 Team</p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              This assignment notification was sent to ${email}. If you didn't expect this email, please contact support.
            </p>
          </div>
        </div>
      `;

      const msg = {
        to: email,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject,
        html
      };

      await sgMail.send(msg);
      console.log(`📧 Assignment approval email sent to ${email}`);
      return { success: true };
    } catch (error) {
      console.error('Error sending assignment approval email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();