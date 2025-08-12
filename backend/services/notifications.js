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
   * Create a notification with filtering based on user preferences
   */
  async createNotification(notificationData) {
    try {
      const {
        userId,
        type,
        title,
        message,
        data = {},
        priority = 'medium',
        action = 'SYSTEM_UPDATE' // Default action for mapping
      } = notificationData;

      // Get user settings (you would typically fetch this from database)
      const userSettings = await this.getUserNotificationSettings(userId);
      
      // Check if notification should be sent based on user preferences
      const shouldSend = notificationFilterService.shouldSendNotification(userSettings, action);
      
      if (!shouldSend) {
        console.log(`🔕 Notification filtered out for user ${userId} - action: ${action}`);
        return { success: true, filtered: true };
      }

      // Get enabled channels for this notification
      const enabledChannels = notificationFilterService.getEnabledChannels(userSettings, action);
      
      console.log(`🔔 Creating notification for user ${userId} - channels: ${enabledChannels.join(', ')}`);

      // Create database notification
      const databaseService = require('./database');
      const notification = await databaseService.createNotification({
        user_id: userId,
        type: type || 'system',
        title,
        message,
        data: JSON.stringify(data),
        priority: priority || notificationFilterService.getNotificationPriority(action),
        read: false,
        created_at: new Date().toISOString()
      });

      // Send notifications through enabled channels
      const results = await this.sendNotificationThroughChannels(
        userId,
        notification,
        enabledChannels,
        userSettings
      );

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
   * Send notification through multiple channels
   */
  async sendNotificationThroughChannels(userId, notification, channels, userSettings) {
    const results = {};

    for (const channel of channels) {
      try {
        switch (channel) {
          case 'email':
            results.email = await this.sendEmailNotification(userId, notification, userSettings);
            break;
          case 'sms':
            results.sms = await this.sendSMSNotification(userId, notification, userSettings);
            break;
          case 'inApp':
            results.inApp = await this.sendInAppNotification(userId, notification, userSettings);
            break;
          case 'browser':
            results.browser = await this.sendBrowserNotification(userId, notification, userSettings);
            break;
        }
      } catch (error) {
        console.error(`❌ Error sending ${channel} notification:`, error);
        results[channel] = { success: false, error: error.message };
      }
    }

    return results;
  }

  /**
   * Get user notification settings
   */
  async getUserNotificationSettings(userId) {
    try {
      // In a real implementation, you would fetch this from the database
      // For now, return default settings
      return notificationFilterService.getDefaultSettings();
    } catch (error) {
      console.error('Error getting user notification settings:', error);
      return notificationFilterService.getDefaultSettings();
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
}

module.exports = new NotificationService();