const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
const { auditLogger } = require('./auditNotificationBridge');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class InvitationAuthService {
  /**
   * Create an invitation link for a user to join an exchange
   */
  static async createInvitation({ 
    exchange_id, 
    email, 
    role = 'client', 
    invited_by_id,
    message = '',
    expires_in_days = 7 
  }) {
    try {
      // Generate unique invitation token
      const token = crypto.randomBytes(32).toString('hex');
      const expires_at = new Date();
      expires_at.setDate(expires_at.getDate() + expires_in_days);

      // Store invitation in database
      const { data: invitation, error } = await supabase
        .from('invitations')
        .insert({
          invitation_token: token,
          exchange_id,
          email,
          role,
          invited_by: invited_by_id,
          custom_message: message,
          expires_at: expires_at.toISOString(),
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      // Generate invitation link
      const invitationLink = `${process.env.FRONTEND_URL}/onboarding/invitation/${token}`;

      // Log invitation creation
      await auditLogger.logActivity({
        user_id: invited_by_id,
        action: 'INVITATION_CREATED',
        resource_type: 'invitation',
        resource_id: invitation.id,
        details: {
          email,
          exchange_id,
          role
        }
      });

      return {
        success: true,
        invitation,
        invitationLink
      };
    } catch (error) {
      console.error('Error creating invitation:', error);
      throw error;
    }
  }

  /**
   * Validate invitation token and get details
   */
  static async validateInvitationToken(token) {
    try {
      const { data: invitation, error } = await supabase
        .from('invitations')
        .select(`
          *,
          exchanges (
            id,
            exchange_name,
            status
          )
        `)
        .eq('invitation_token', token)
        .eq('status', 'pending')
        .single();

      if (error || !invitation) {
        return {
          valid: false,
          error: 'Invalid or expired invitation token'
        };
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('invitations')
          .update({ status: 'expired' })
          .eq('id', invitation.id);

        return {
          valid: false,
          error: 'This invitation has expired'
        };
      }

      return {
        valid: true,
        invitation
      };
    } catch (error) {
      console.error('Error validating invitation:', error);
      return {
        valid: false,
        error: 'Failed to validate invitation'
      };
    }
  }

  /**
   * Accept invitation and create user account with phone verification
   */
  static async acceptInvitation({
    token,
    password,
    phone,
    first_name,
    last_name
  }) {
    try {
      // Validate invitation first
      const validation = await this.validateInvitationToken(token);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const { invitation } = validation;

      // Create user in Supabase Auth with phone
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        phone,
        options: {
          data: {
            first_name,
            last_name,
            role: invitation.role,
            exchange_id: invitation.exchange_id
          }
        }
      });

      if (authError) throw authError;

      // Create user record in our users table
      const { data: user, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: invitation.email,
          phone,
          first_name,
          last_name,
          role: invitation.role,
          is_active: true,
          email_verified: false,
          phone_verified: false,
          onboarding_completed: false
        })
        .select()
        .single();

      if (userError) throw userError;

      // Add user to exchange
      await supabase
        .from('exchange_participants')
        .insert({
          exchange_id: invitation.exchange_id,
          user_id: user.id,
          role: invitation.role,
          added_by: invitation.invited_by_id
        });

      // Update invitation status
      await supabase
        .from('invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          user_id: user.id
        })
        .eq('id', invitation.id);

      // Send OTP to phone for verification
      const { error: otpError } = await supabase.auth.signInWithOtp({
        phone
      });

      if (otpError) {
        console.error('Error sending OTP:', otpError);
      }

      // Log acceptance
      await auditLogger.logActivity({
        user_id: user.id,
        action: 'INVITATION_ACCEPTED',
        resource_type: 'invitation',
        resource_id: invitation.id,
        details: {
          exchange_id: invitation.exchange_id
        }
      });

      return {
        success: true,
        user,
        requiresPhoneVerification: true
      };
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Verify phone number with OTP
   */
  static async verifyPhoneOTP({ phone, token }) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: 'sms'
      });

      if (error) throw error;

      // Update user's phone verification status
      if (data.user) {
        await supabase
          .from('users')
          .update({ 
            phone_verified: true,
            phone_verified_at: new Date().toISOString()
          })
          .eq('id', data.user.id);

        // Log verification
        await auditLogger.logActivity({
          user_id: data.user.id,
          action: 'PHONE_VERIFIED',
          resource_type: 'user',
          resource_id: data.user.id
        });
      }

      return {
        success: true,
        user: data.user,
        session: data.session
      };
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  }

  /**
   * Resend OTP to phone
   */
  static async resendPhoneOTP(phone) {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        phone
      });

      if (error) throw error;

      return {
        success: true,
        message: 'OTP sent successfully'
      };
    } catch (error) {
      console.error('Error resending OTP:', error);
      throw error;
    }
  }

  /**
   * Complete onboarding process
   */
  static async completeOnboarding(userId, additionalData = {}) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .update({
          onboarding_completed: true,
          onboarding_completed_at: new Date().toISOString(),
          ...additionalData
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) throw error;

      // Log onboarding completion
      await auditLogger.logActivity({
        user_id: userId,
        action: 'ONBOARDING_COMPLETED',
        resource_type: 'user',
        resource_id: userId
      });

      return {
        success: true,
        user
      };
    } catch (error) {
      console.error('Error completing onboarding:', error);
      throw error;
    }
  }

  /**
   * Get all pending invitations for an exchange
   */
  static async getExchangeInvitations(exchangeId) {
    try {
      // Get ALL invitations for this exchange, not filtered by status
      const { data: invitations, error } = await supabase
        .from('invitations')
        .select(`
          *,
          exchanges (
            id,
            exchange_name,
            exchange_number,
            status
          )
        `)
        .eq('exchange_id', exchangeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log(`📋 Found ${invitations?.length || 0} invitations for exchange ${exchangeId}`);

      // Transform the data to match frontend expectations
      const transformedInvitations = invitations?.map(inv => ({
        ...inv,
        token: inv.invitation_token, // Map invitation_token to token
        message: inv.custom_message, // Map custom_message to message
        invited_by: inv.invited_by ? { id: inv.invited_by } : undefined, // Will need to fetch user details separately
        exchange: inv.exchanges // Include exchange details
      })) || [];

      return transformedInvitations;
    } catch (error) {
      console.error('Error fetching exchange invitations:', error);
      throw error;
    }
  }

  /**
   * Cancel an invitation
   */
  static async cancelInvitation(invitationId, cancelledById) {
    try {
      const { data: invitation, error } = await supabase
        .from('invitations')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_by_id: cancelledById
        })
        .eq('id', invitationId)
        .select()
        .single();

      if (error) throw error;

      // Log cancellation
      await auditLogger.logActivity({
        user_id: cancelledById,
        action: 'INVITATION_CANCELLED',
        resource_type: 'invitation',
        resource_id: invitationId
      });

      return {
        success: true,
        invitation
      };
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      throw error;
    }
  }

  /**
   * Bulk invite multiple users to an exchange
   */
  static async bulkInvite({ exchange_id, emails, role, invited_by_id, message }) {
    try {
      const results = {
        successful: [],
        failed: []
      };

      for (const email of emails) {
        try {
          const result = await this.createInvitation({
            exchange_id,
            email,
            role,
            invited_by_id,
            message
          });
          results.successful.push({
            email,
            invitationLink: result.invitationLink
          });
        } catch (error) {
          results.failed.push({
            email,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in bulk invite:', error);
      throw error;
    }
  }
}

module.exports = InvitationAuthService;