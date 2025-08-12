const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
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
      console.log('✅ Welcome email sent to:', email);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, firstName, resetToken) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping password reset email to:', email);
      return { success: true, skipped: true };
    }

    try {
      const resetUrl = `${this.baseUrl}/reset-password?token=${resetToken}`;
      const subject = 'Reset Your Password - Peak 1031';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1>Password Reset Request</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2>Hello ${firstName},</h2>
            
            <p>We received a request to reset your password for your Peak 1031 account.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" 
                 style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Your Password
              </a>
            </div>
            
            <p>This link will expire in 1 hour for security reasons.</p>
            
            <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
            
            <p>For security reasons, if you continue to receive these emails, please contact our support team immediately.</p>
            
            <p>Best regards,<br>The Peak 1031 Team</p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              This email was sent to ${email}. This link expires in 1 hour.
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
      console.log('✅ Password reset email sent to:', email);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send password reset confirmation email
   */
  async sendPasswordResetConfirmation(email, firstName) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping password reset confirmation email to:', email);
      return { success: true, skipped: true };
    }

    try {
      const subject = 'Password Reset Successful - Peak 1031';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1>Password Reset Successful</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2>Hello ${firstName},</h2>
            
            <p>Your password has been successfully reset for your Peak 1031 account.</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>✅ Password Reset Complete</strong></p>
              <p style="margin: 5px 0 0 0;">You can now log in with your new password.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.baseUrl}/login" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Log In Now
              </a>
            </div>
            
            <p>If you didn't reset your password, please contact our support team immediately as your account may be compromised.</p>
            
            <p>For your security, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Enabling two-factor authentication</li>
              <li>Not sharing your login credentials</li>
            </ul>
            
            <p>Best regards,<br>The Peak 1031 Team</p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              This email was sent to ${email} at ${new Date().toLocaleString()}.
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
      console.log('✅ Password reset confirmation sent to:', email);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send password reset confirmation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send 2FA enabled confirmation
   */
  async sendTwoFactorEnabled(email, firstName) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping 2FA enabled email to:', email);
      return { success: true, skipped: true };
    }

    try {
      const subject = 'Two-Factor Authentication Enabled - Peak 1031';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1>🔒 2FA Enabled</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2>Hello ${firstName},</h2>
            
            <p>Two-factor authentication has been successfully enabled for your Peak 1031 account.</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>✅ Enhanced Security Active</strong></p>
              <p style="margin: 5px 0 0 0;">Your account is now protected with an additional layer of security.</p>
            </div>
            
            <h3>What This Means:</h3>
            <ul>
              <li>You'll need both your password and authenticator code to log in</li>
              <li>Your account is protected even if your password is compromised</li>
              <li>You can manage 2FA settings in your account preferences</li>
            </ul>
            
            <p><strong>Important:</strong> Make sure to save your backup codes in a secure location. You can access them in your account settings.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.baseUrl}/dashboard" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Access Your Account
              </a>
            </div>
            
            <p>If you didn't enable 2FA, please contact our support team immediately.</p>
            
            <p>Best regards,<br>The Peak 1031 Team</p>
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
      console.log('✅ 2FA enabled email sent to:', email);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send 2FA enabled email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send 2FA disabled confirmation
   */
  async sendTwoFactorDisabled(email, firstName) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping 2FA disabled email to:', email);
      return { success: true, skipped: true };
    }

    try {
      const subject = 'Two-Factor Authentication Disabled - Peak 1031';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
            <h1>🔓 2FA Disabled</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2>Hello ${firstName},</h2>
            
            <p>Two-factor authentication has been disabled for your Peak 1031 account.</p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>⚠️ Security Level Reduced</strong></p>
              <p style="margin: 5px 0 0 0;">Your account now relies only on password protection.</p>
            </div>
            
            <p>We strongly recommend keeping 2FA enabled for the best security. You can re-enable it at any time in your account settings.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.baseUrl}/dashboard/settings" 
                 style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Re-enable 2FA
              </a>
            </div>
            
            <p>If you didn't disable 2FA, please contact our support team immediately and change your password.</p>
            
            <p>Best regards,<br>The Peak 1031 Team</p>
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
      console.log('✅ 2FA disabled email sent to:', email);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send 2FA disabled email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send SMS notification
   */
  async sendSMS(phoneNumber, message) {
    if (!this.twilioEnabled) {
      console.log('📱 Twilio not enabled - skipping SMS to:', phoneNumber);
      return { success: true, skipped: true };
    }

    try {
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.fromPhone,
        to: phoneNumber
      });

      console.log('✅ SMS sent:', result.sid);
      return { success: true, messageId: result.sid };
    } catch (error) {
      console.error('❌ Failed to send SMS:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send document notification
   */
  async sendDocumentNotification(email, firstName, documentName, exchangeName, action = 'uploaded') {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping document notification email to:', email);
      return { success: true, skipped: true };
    }

    try {
      const subject = `New Document ${action.charAt(0).toUpperCase() + action.slice(1)} - ${exchangeName}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1>📄 Document ${action.charAt(0).toUpperCase() + action.slice(1)}</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2>Hello ${firstName},</h2>
            
            <p>A document has been ${action} for your exchange.</p>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Exchange:</strong> ${exchangeName}</p>
              <p style="margin: 5px 0 0 0;"><strong>Document:</strong> ${documentName}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.baseUrl}/dashboard" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Document
              </a>
            </div>
            
            <p>You can access this document in your exchange dashboard.</p>
            
            <p>Best regards,<br>The Peak 1031 Team</p>
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
      console.log('✅ Document notification sent to:', email);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send document notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send message notification
   */
  async sendMessageNotification(email, firstName, senderName, exchangeName, messagePreview) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping message notification email to:', email);
      return { success: true, skipped: true };
    }

    try {
      const subject = `New Message from ${senderName} - ${exchangeName}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1>💬 New Message</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2>Hello ${firstName},</h2>
            
            <p>You have a new message in your exchange.</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>From:</strong> ${senderName}</p>
              <p style="margin: 5px 0;"><strong>Exchange:</strong> ${exchangeName}</p>
              <div style="margin-top: 10px; padding: 10px; background-color: #dcfce7; border-radius: 4px;">
                <em>${messagePreview}</em>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.baseUrl}/dashboard" 
                 style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Message
              </a>
            </div>
            
            <p>You can reply directly in your exchange dashboard.</p>
            
            <p>Best regards,<br>The Peak 1031 Team</p>
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
      console.log('✅ Message notification sent to:', email);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send message notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send exchange created notification to participants
   */
  async sendExchangeCreatedNotification(exchange) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping exchange creation notifications');
      return { success: true, skipped: true };
    }

    try {
      const participants = exchange.exchangeParticipants || [];
      const notifications = [];

      for (const participant of participants) {
        if (participant.contact && participant.contact.email) {
          // Send to client contacts
          const result = await this.sendExchangeInvitationEmail(
            participant.contact.email,
            participant.contact.first_name || 'there',
            exchange.name,
            exchange.exchange_number,
            'client'
          );
          notifications.push(result);
        } else if (participant.user && participant.user.email) {
          // Send to internal users
          const result = await this.sendExchangeInvitationEmail(
            participant.user.email,
            participant.user.first_name || 'there',
            exchange.name,
            exchange.exchange_number,
            participant.role
          );
          notifications.push(result);
        }
      }

      console.log(`✅ Exchange creation notifications sent: ${notifications.filter(n => n.success).length}/${notifications.length}`);
      return { success: true, notifications };
    } catch (error) {
      console.error('❌ Failed to send exchange creation notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send exchange invitation email
   */
  async sendExchangeInvitationEmail(email, firstName, exchangeName, exchangeNumber, role) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping invitation email to:', email);
      return { success: true, skipped: true };
    }

    try {
      const subject = `You've been invited to join: ${exchangeName}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1>📋 Exchange Invitation</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2>Hello ${firstName},</h2>
            
            <p>You have been invited to participate in a 1031 exchange transaction.</p>
            
            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Exchange:</strong> ${exchangeName}</p>
              <p style="margin: 5px 0;"><strong>Exchange Number:</strong> ${exchangeNumber}</p>
              <p style="margin: 5px 0;"><strong>Your Role:</strong> ${role}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.baseUrl}/exchanges/${exchangeNumber}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Exchange Details
              </a>
            </div>
            
            <h3>What You Can Do:</h3>
            <ul>
              <li>View exchange documents and progress</li>
              <li>Communicate with other participants</li>
              <li>Upload required documents</li>
              <li>Track important deadlines</li>
            </ul>
            
            <p>If you have any questions about this exchange, please contact your coordinator.</p>
            
            <p>Best regards,<br>The Peak 1031 Team</p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              This invitation was sent to ${email}. If you didn't expect this invitation, please contact support.
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
      console.log('✅ Exchange invitation sent to:', email);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send exchange invitation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send status change notification
   */
  async sendStatusChangeNotification(exchange, oldStatus, newStatus) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping status change notifications');
      return { success: true, skipped: true };
    }

    try {
      const participants = exchange.exchangeParticipants || [];
      const notifications = [];

      for (const participant of participants) {
        if (participant.contact && participant.contact.email) {
          const result = await this.sendStatusChangeEmail(
            participant.contact.email,
            participant.contact.first_name || 'there',
            exchange.name,
            oldStatus,
            newStatus
          );
          notifications.push(result);
        } else if (participant.user && participant.user.email) {
          const result = await this.sendStatusChangeEmail(
            participant.user.email,
            participant.user.first_name || 'there',
            exchange.name,
            oldStatus,
            newStatus
          );
          notifications.push(result);
        }
      }

      console.log(`✅ Status change notifications sent: ${notifications.filter(n => n.success).length}/${notifications.length}`);
      return { success: true, notifications };
    } catch (error) {
      console.error('❌ Failed to send status change notifications:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send status change email
   */
  async sendStatusChangeEmail(email, firstName, exchangeName, oldStatus, newStatus) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping status change email to:', email);
      return { success: true, skipped: true };
    }

    try {
      const subject = `Exchange Status Updated: ${exchangeName}`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #16a34a; color: white; padding: 20px; text-align: center;">
            <h1>🔄 Status Update</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2>Hello ${firstName},</h2>
            
            <p>The status of your exchange has been updated.</p>
            
            <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Exchange:</strong> ${exchangeName}</p>
              <p style="margin: 5px 0;"><strong>Previous Status:</strong> ${oldStatus}</p>
              <p style="margin: 5px 0;"><strong>New Status:</strong> ${newStatus}</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.baseUrl}/dashboard" 
                 style="background-color: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                View Exchange
              </a>
            </div>
            
            <p>Please review any new requirements or deadlines associated with this status change.</p>
            
            <p>Best regards,<br>The Peak 1031 Team</p>
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
      console.log('✅ Status change notification sent to:', email);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send status change notification:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send user invitation notification
   */
  async sendUserInvitationNotification(email, firstName, invitedBy, exchangeName, role) {
    if (!this.sendGridEnabled) {
      console.log('📧 SendGrid not enabled - skipping user invitation email to:', email);
      return { success: true, skipped: true };
    }

    try {
      const subject = `You've been invited to join Peak 1031 Platform`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
            <h1>👋 Welcome to Peak 1031</h1>
          </div>
          
          <div style="padding: 30px;">
            <h2>Hello ${firstName},</h2>
            
            <p>You have been invited by <strong>${invitedBy}</strong> to join the Peak 1031 Exchange Management Platform.</p>
            
            ${exchangeName ? `
              <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                <p style="margin: 0;"><strong>Exchange:</strong> ${exchangeName}</p>
                <p style="margin: 5px 0;"><strong>Your Role:</strong> ${role}</p>
              </div>
            ` : ''}
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${this.baseUrl}/auth/register?email=${encodeURIComponent(email)}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Create Your Account
              </a>
            </div>
            
            <h3>What You'll Be Able To Do:</h3>
            <ul>
              <li>Access exchange documents and information</li>
              <li>Communicate with other participants</li>
              <li>Track important deadlines and milestones</li>
              <li>Upload required documents</li>
              <li>Receive real-time updates and notifications</li>
            </ul>
            
            <p>If you have any questions, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br>The Peak 1031 Team</p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              This invitation was sent to ${email}. If you didn't expect this invitation, please ignore this email.
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
      console.log('✅ User invitation sent to:', email);
      
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to send user invitation:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();