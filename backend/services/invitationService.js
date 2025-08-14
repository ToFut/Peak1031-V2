const crypto = require('crypto');
const sgMail = require('@sendgrid/mail');
const twilio = require('twilio');
const supabaseService = require('./supabase');

class InvitationService {
  constructor() {
    // Initialize SendGrid (fallback)
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.sendgridEnabled = true;
      console.log('✅ SendGrid initialized for invitations (fallback)');
    } else {
      this.sendgridEnabled = false;
      console.log('⚠️ SendGrid not configured');
    }

    // Initialize Twilio (fallback)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      this.twilioEnabled = true;
      console.log('✅ Twilio initialized for invitations (fallback)');
    } else {
      this.twilioEnabled = false;
      console.log('⚠️ Twilio not configured');
    }

    this.frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    console.log('✅ InvitationService initialized - using Supabase Auth for invitations');
  }

  /**
   * Generate a secure invitation token
   */
  generateInvitationToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get default permissions based on role
   */
  getDefaultPermissions(role) {
    const permissions = {
      admin: ['read', 'write', 'delete', 'invite', 'manage_users', 'manage_settings'],
      coordinator: ['read', 'write', 'invite', 'manage_participants'],
      client: ['read', 'comment', 'upload_documents'],
      third_party: ['read', 'comment'],
      agency: ['read', 'write', 'manage_clients']
    };
    
    return permissions[role] || permissions.client;
  }

  /**
   * Send invitation using Supabase Auth (primary method)
   */
  async sendSupabaseInvitation(options) {
    const {
      email,
      exchangeName,
      inviterName,
      role,
      firstName,
      lastName,
      customMessage,
      exchangeId,
      inviterId
    } = options;

    try {
      // Check if we have admin client
      if (!supabaseService.client.auth.admin) {
        console.log('⚠️ Supabase Admin client not available, using email fallback');
        // Return false to trigger fallback
        return {
          email: { sent: false, error: 'Admin client not available' },
          sms: { sent: false, error: null }
        };
      }

      // Use Supabase Auth Admin to invite user by email
      const { data, error } = await supabaseService.client.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${this.frontendUrl}/auth/callback?exchange=${exchangeId}`,
        data: {
          // Custom metadata that will be included in the user profile
          exchange_id: exchangeId,
          exchange_name: exchangeName,
          inviter_name: inviterName,
          role: role,
          first_name: firstName,
          last_name: lastName,
          custom_message: customMessage,
          invited_by: inviterId,
          invitation_type: 'exchange_invite'
        }
      });

      if (error) {
        console.error('❌ Supabase invitation error:', error);
        return {
          email: { sent: false, error: error.message },
          sms: { sent: false, error: null }
        };
      }

      console.log(`✅ Supabase invitation sent to ${email}:`, data);
      return {
        email: { sent: true, error: null },
        sms: { sent: false, error: null },
        supabaseUser: data.user
      };

    } catch (error) {
      console.error('❌ Failed to send Supabase invitation:', error);
      return {
        email: { sent: false, error: error.message },
        sms: { sent: false, error: null }
      };
    }
  }

  /**
   * Send invitation email and/or SMS (SendGrid primary method)
   */
  async sendInvitation(options) {
    // Skip Supabase Auth - use SendGrid directly
    console.log('🔄 Using SendGrid for invitations...');

    const {
      email,
      phone,
      method,
      invitationToken,
      exchangeName,
      inviterName,
      role,
      firstName,
      lastName,
      customMessage,
      exchangeId,
      inviterId,
      isResend = false
    } = options;

    const results = {
      email: { sent: false, error: null },
      sms: { sent: false, error: null }
    };

    // Generate token if not provided
    const token = invitationToken || this.generateInvitationToken();
    const inviteUrl = `${this.frontendUrl}/invite/${token}`;
    const displayName = firstName && lastName ? `${firstName} ${lastName}` : email;

    // Send email invitation
    if (method === 'email' || method === 'both') {
      if (this.sendgridEnabled) {
        try {
          console.log(`🔄 Attempting to send invitation email to ${email}`);
          console.log(`📧 SendGrid API Key configured: ${process.env.SENDGRID_API_KEY ? 'Yes' : 'No'}`);
          console.log(`📧 From email: ${process.env.SENDGRID_FROM_EMAIL}`);
          
          await this.sendInvitationEmail({
            email,
            inviteUrl,
            exchangeName,
            inviterName,
            role,
            displayName,
            customMessage,
            isResend
          });
          results.email.sent = true;
          console.log(`✅ Invitation email sent successfully to ${email}`);
        } catch (error) {
          console.error(`❌ Failed to send invitation email to ${email}:`, error);
          console.error(`❌ Error details:`, error);
          results.email.error = error.message;
        }
      } else {
        // Development mode - mock email sending
        console.log('📧 MOCK EMAIL INVITATION:');
        console.log(`   To: ${email}`);
        console.log(`   Exchange: ${exchangeName}`);
        console.log(`   Inviter: ${inviterName}`);
        console.log(`   Role: ${role}`);
        console.log(`   Invitation URL: ${inviteUrl}`);
        if (customMessage) {
          console.log(`   Message: ${customMessage}`);
        }
        console.log('📧 END MOCK EMAIL');
        
        // Simulate successful sending in development
        results.email.sent = true;
        results.invitationToken = token; // Return the token for storing
        console.log(`✅ Mock invitation email "sent" to ${email}`);
      }
    }

    // Send SMS invitation
    if ((method === 'sms' || method === 'both') && phone && this.twilioEnabled) {
      try {
        await this.sendInvitationSMS({
          phone,
          inviteUrl,
          exchangeName,
          inviterName,
          role,
          displayName,
          customMessage,
          isResend
        });
        results.sms.sent = true;
        console.log(`✅ Invitation SMS sent to ${phone}`);
      } catch (error) {
        console.error(`❌ Failed to send invitation SMS to ${phone}:`, error);
        results.sms.error = error.message;
      }
    }

    // Always include the token in the results
    results.invitationToken = token;
    return results;
  }

  /**
   * Send invitation email using SendGrid
   */
  async sendInvitationEmail(options) {
    const {
      email,
      inviteUrl,
      exchangeName,
      inviterName,
      role,
      displayName,
      customMessage,
      isResend
    } = options;

    console.log(`📧 Preparing SendGrid email for ${email}`);
    console.log(`📧 Exchange: ${exchangeName}`);
    console.log(`📧 Inviter: ${inviterName}`);
    console.log(`📧 Invite URL: ${inviteUrl}`);

    const subject = isResend 
      ? `Reminder: You're invited to join ${exchangeName} - Peak 1031 Exchange`
      : `You're invited to join ${exchangeName} - Peak 1031 Exchange`;

    const htmlContent = this.generateInvitationEmailHTML({
      inviteUrl,
      exchangeName,
      inviterName,
      role,
      displayName,
      customMessage,
      isResend
    });

    const textContent = this.generateInvitationEmailText({
      inviteUrl,
      exchangeName,
      inviterName,
      role,
      displayName,
      customMessage,
      isResend
    });

    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@peak1031.com',
        name: process.env.SENDGRID_FROM_NAME || 'Peak 1031 Platform'
      },
      subject,
      text: textContent,
      html: htmlContent,
      // Track clicks and opens
      trackingSettings: {
        clickTracking: {
          enable: true
        },
        openTracking: {
          enable: true
        }
      }
    };

    console.log(`📧 SendGrid message prepared:`, {
      to: msg.to,
      from: msg.from,
      subject: msg.subject
    });

    try {
      const response = await sgMail.send(msg);
      console.log(`✅ SendGrid API response:`, response[0].statusCode);
      return response;
    } catch (error) {
      console.error(`❌ SendGrid API error:`, error.response?.body || error.message);
      throw error;
    }
  }

  /**
   * Send invitation SMS using Twilio
   */
  async sendInvitationSMS(options) {
    const {
      phone,
      inviteUrl,
      exchangeName,
      inviterName,
      role,
      displayName,
      customMessage,
      isResend
    } = options;

    const message = isResend 
      ? `Reminder: ${inviterName} has invited you to join the 1031 exchange "${exchangeName}" as a ${role}. Complete your signup: ${inviteUrl}`
      : `${inviterName} has invited you to join the 1031 exchange "${exchangeName}" as a ${role}. Complete your signup: ${inviteUrl}`;

    await this.twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: phone
    });
  }

  /**
   * Send notification to existing user about being added to exchange
   */
  async sendExchangeNotification(options) {
    const {
      email,
      phone,
      method,
      exchangeName,
      inviterName,
      role,
      customMessage,
      type
    } = options;

    const results = {
      email: { sent: false, error: null },
      sms: { sent: false, error: null }
    };

    const loginUrl = `${this.frontendUrl}/login`;

    // Send email notification
    if ((method === 'email' || method === 'both') && this.sendgridEnabled) {
      try {
        await this.sendExchangeNotificationEmail({
          email,
          loginUrl,
          exchangeName,
          inviterName,
          role,
          customMessage,
          type
        });
        results.email.sent = true;
      } catch (error) {
        results.email.error = error.message;
      }
    }

    // Send SMS notification
    if ((method === 'sms' || method === 'both') && phone && this.twilioEnabled) {
      try {
        await this.sendExchangeNotificationSMS({
          phone,
          loginUrl,
          exchangeName,
          inviterName,
          role,
          customMessage,
          type
        });
        results.sms.sent = true;
      } catch (error) {
        results.sms.error = error.message;
      }
    }

    return results;
  }

  /**
   * Send exchange notification email
   */
  async sendExchangeNotificationEmail(options) {
    const {
      email,
      loginUrl,
      exchangeName,
      inviterName,
      role,
      customMessage,
      type
    } = options;

    const subject = `You've been added to ${exchangeName} - Peak 1031 Exchange`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Added to Exchange</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Peak 1031 Exchange</h1>
          <p style="color: #f0f4f8; margin: 10px 0 0 0; font-size: 16px;">You've Been Added to an Exchange</p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
          <h2 style="color: #2d3748; margin-bottom: 20px;">Good news!</h2>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            ${inviterName} has added you to the 1031 exchange <strong>"${exchangeName}"</strong> as a ${role}.
          </p>
          
          ${customMessage ? `
            <div style="background: #f7fafc; border-left: 4px solid #4299e1; padding: 15px; margin: 20px 0; font-style: italic;">
              "${customMessage}"
            </div>
          ` : ''}
          
          <p style="margin-bottom: 25px;">You can now log in to access the exchange and start collaborating:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
              Login to Access Exchange
            </a>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <h3 style="color: #495057; margin-top: 0;">Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}</h3>
            <p style="margin-bottom: 0; font-size: 14px; color: #6c757d;">
              As a ${role}, you'll have access to exchange documents, communications, and relevant tools for this 1031 exchange process.
            </p>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0; font-size: 14px; color: #6c757d;">
            Peak 1031 Exchange Platform - Secure & Compliant 1031 Exchange Management
          </p>
        </div>
      </body>
      </html>
    `;

    const textContent = `
You've Been Added to an Exchange - Peak 1031 Exchange

${inviterName} has added you to the 1031 exchange "${exchangeName}" as a ${role}.

${customMessage ? `Message: "${customMessage}"` : ''}

You can now log in to access the exchange: ${loginUrl}

Your role as a ${role} gives you access to exchange documents, communications, and relevant tools for this 1031 exchange process.

Peak 1031 Exchange Platform - Secure & Compliant 1031 Exchange Management
    `;

    const msg = {
      to: email,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@peak1031.com',
        name: process.env.SENDGRID_FROM_NAME || 'Peak 1031 Platform'
      },
      subject,
      text: textContent,
      html: htmlContent
    };

    await sgMail.send(msg);
  }

  /**
   * Send exchange notification SMS
   */
  async sendExchangeNotificationSMS(options) {
    const {
      phone,
      loginUrl,
      exchangeName,
      inviterName,
      role
    } = options;

    const message = `${inviterName} has added you to the 1031 exchange "${exchangeName}" as a ${role}. Login to access: ${loginUrl}`;

    await this.twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER,
      to: phone
    });
  }

  /**
   * Generate invitation email HTML
   */
  generateInvitationEmailHTML(options) {
    const {
      inviteUrl,
      exchangeName,
      inviterName,
      role,
      displayName,
      customMessage,
      isResend
    } = options;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${isResend ? 'Reminder: ' : ''}Exchange Invitation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Peak 1031 Exchange</h1>
          <p style="color: #f0f4f8; margin: 10px 0 0 0; font-size: 16px;">
            ${isResend ? 'Reminder: ' : ''}You're Invited!
          </p>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
          <h2 style="color: #2d3748; margin-bottom: 20px;">
            ${isResend ? 'Reminder: ' : ''}Join ${exchangeName}
          </h2>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            Hello ${displayName},
          </p>
          
          <p style="font-size: 16px; margin-bottom: 20px;">
            ${inviterName} has invited you to join the 1031 exchange <strong>"${exchangeName}"</strong> as a ${role}.
          </p>
          
          ${customMessage ? `
            <div style="background: #f7fafc; border-left: 4px solid #4299e1; padding: 15px; margin: 20px 0; font-style: italic;">
              "${customMessage}"
            </div>
          ` : ''}
          
          <p style="margin-bottom: 25px;">
            Click the button below to create your account and get started:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; padding: 15px 30px; border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
              Accept Invitation & Create Account
            </a>
          </div>
          
          <p style="font-size: 14px; color: #666; text-align: center; margin-bottom: 20px;">
            Or copy and paste this link: <br>
            <a href="${inviteUrl}" style="color: #4299e1; word-break: break-all;">${inviteUrl}</a>
          </p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 30px;">
            <h3 style="color: #495057; margin-top: 0;">What is Peak 1031 Exchange?</h3>
            <p style="margin-bottom: 0; font-size: 14px; color: #6c757d;">
              Peak 1031 Exchange is a secure platform for managing 1031 like-kind exchanges. 
              As a ${role}, you'll have access to exchange documents, real-time communication, 
              and all the tools needed for a successful exchange process.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; margin-top: 30px; padding-top: 20px;">
            <p style="font-size: 12px; color: #9ca3af; margin-bottom: 10px;">
              <strong>Security Note:</strong> This invitation is secure and expires in 7 days. 
              Only you can access this link with your email address.
            </p>
            <p style="font-size: 12px; color: #9ca3af; margin: 0;">
              If you did not expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0; border-top: none;">
          <p style="margin: 0; font-size: 14px; color: #6c757d;">
            Peak 1031 Exchange Platform - Secure & Compliant 1031 Exchange Management
          </p>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate invitation email text
   */
  generateInvitationEmailText(options) {
    const {
      inviteUrl,
      exchangeName,
      inviterName,
      role,
      displayName,
      customMessage,
      isResend
    } = options;

    return `
${isResend ? 'REMINDER: ' : ''}YOU'RE INVITED TO JOIN A 1031 EXCHANGE

Peak 1031 Exchange Platform

Hello ${displayName},

${inviterName} has invited you to join the 1031 exchange "${exchangeName}" as a ${role}.

${customMessage ? `Message from ${inviterName}: "${customMessage}"` : ''}

To accept this invitation and create your account, please visit:
${inviteUrl}

ABOUT PEAK 1031 EXCHANGE:
Peak 1031 Exchange is a secure platform for managing 1031 like-kind exchanges. As a ${role}, you'll have access to exchange documents, real-time communication, and all the tools needed for a successful exchange process.

SECURITY NOTE:
This invitation is secure and expires in 7 days. Only you can access this link with your email address.

If you did not expect this invitation, you can safely ignore this email.

Peak 1031 Exchange Platform - Secure & Compliant 1031 Exchange Management
    `;
  }

  /**
   * Validate invitation token format
   */
  validateInvitationToken(token) {
    return token && typeof token === 'string' && token.length === 64 && /^[a-f0-9]+$/.test(token);
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role) {
    const roleNames = {
      admin: 'Administrator',
      coordinator: 'Exchange Coordinator', 
      client: 'Client',
      third_party: 'Third Party',
      agency: 'Agency Representative'
    };
    
    return roleNames[role] || role;
  }

  /**
   * Get role permissions description
   */
  getRoleDescription(role) {
    const descriptions = {
      admin: 'Full system access with user management capabilities',
      coordinator: 'Manage exchanges and invite participants',
      client: 'Access assigned exchanges and upload documents',
      third_party: 'View exchange information and communications',
      agency: 'Manage multiple client exchanges'
    };
    
    return descriptions[role] || 'Standard user access';
  }
}

module.exports = new InvitationService();