const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const supabaseService = require('../services/supabase');
const invitationService = require('../services/invitationService');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Send invitations to exchange
router.post('/:exchangeId/send', authenticateToken, requireRole(['admin', 'coordinator']), [
  body('invitations').isArray().withMessage('Invitations must be an array'),
  body('invitations.*.email').isEmail().withMessage('Valid email is required'),
  body('invitations.*.role').isIn(['client', 'third_party', 'agency', 'coordinator']).withMessage('Invalid role'),
  body('invitations.*.method').isIn(['email', 'sms', 'both']).withMessage('Invalid invitation method'),
  body('invitations.*.phone').optional().isMobilePhone().withMessage('Valid phone number required for SMS'),
  body('invitations.*.firstName').optional().isString(),
  body('invitations.*.lastName').optional().isString(),
  body('message').optional().isString().isLength({ max: 500 }).withMessage('Message too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { exchangeId } = req.params;
    const { invitations, message } = req.body;
    const inviterId = req.user.id;

    // Verify exchange exists and user has access
    const exchange = await supabaseService.getExchangeById(exchangeId);
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }

    // Verify user can invite to this exchange
    const userRole = req.user.role;
    const isCoordinator = exchange.coordinator_id === inviterId;
    
    if (userRole !== 'admin' && !isCoordinator) {
      return res.status(403).json({ error: 'Not authorized to send invitations for this exchange' });
    }

    const results = [];
    
    for (const invitation of invitations) {
      try {
        // Check if user already exists
        const existingUser = await supabaseService.getUserByEmail(invitation.email);
        
        if (existingUser) {
          // User exists - check if already participant
          const existingParticipants = await supabaseService.getExchangeParticipants({
            where: { exchangeId }
          });
          
          const isAlreadyParticipant = existingParticipants.some(p => 
            p.user_id === existingUser.id || p.contact_id === existingUser.id
          );
          
          if (isAlreadyParticipant) {
            results.push({
              email: invitation.email,
              status: 'already_participant',
              message: 'User is already a participant in this exchange'
            });
            continue;
          }
          
          // Add existing user as participant
          await supabaseService.createExchangeParticipant({
            id: uuidv4(),
            exchange_id: exchangeId,
            user_id: existingUser.id,
            role: invitation.role,
            permissions: invitationService.getDefaultPermissions(invitation.role),
            status: 'active',
            invited_by: inviterId,
            invited_at: new Date().toISOString()
          });
          
          // Send notification to existing user
          await invitationService.sendExchangeNotification({
            email: invitation.email,
            phone: invitation.phone,
            method: invitation.method,
            exchangeName: exchange.name || exchange.exchange_number,
            inviterName: req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user.email,
            role: invitation.role,
            customMessage: message,
            type: 'added_to_exchange'
          });
          
          results.push({
            email: invitation.email,
            status: 'added_existing_user',
            message: 'Existing user added to exchange and notified'
          });
          
        } else {
          // Create invitation for new user using Supabase Auth
          const invitationId = uuidv4();
          
          // Send invitation using Supabase Auth
          const inviteResult = await invitationService.sendInvitation({
            email: invitation.email,
            phone: invitation.phone,
            method: invitation.method,
            exchangeName: exchange.name || exchange.exchange_number,
            inviterName: req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user.email,
            role: invitation.role,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            customMessage: message,
            exchangeId: exchangeId,
            inviterId: inviterId
          });

          if (inviteResult.email.sent) {
            // Store invitation record for tracking
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            
            await supabaseService.insert('invitations', {
              id: invitationId,
              email: invitation.email,
              phone: invitation.phone,
              exchange_id: exchangeId,
              role: invitation.role,
              invited_by: inviterId,
              invitation_token: inviteResult.supabaseUser?.id || invitationId,
              expires_at: expiresAt.toISOString(),
              status: 'pending',
              first_name: invitation.firstName,
              last_name: invitation.lastName,
              custom_message: message,
              created_at: new Date().toISOString(),
              supabase_user_id: inviteResult.supabaseUser?.id
            });

            results.push({
              email: invitation.email,
              status: 'invitation_sent',
              message: 'Invitation sent successfully via Supabase Auth',
              expiresAt: expiresAt.toISOString()
            });
          } else {
            results.push({
              email: invitation.email,
              status: 'error',
              message: inviteResult.email.error || 'Failed to send invitation'
            });
          }
        }
        
      } catch (error) {
        console.error(`Error processing invitation for ${invitation.email}:`, error);
        results.push({
          email: invitation.email,
          status: 'error',
          message: error.message
        });
      }
    }

    res.json({
      success: true,
      results,
      exchangeId,
      totalSent: results.filter(r => ['invitation_sent', 'added_existing_user'].includes(r.status)).length,
      totalErrors: results.filter(r => r.status === 'error').length
    });

  } catch (error) {
    console.error('Error sending invitations:', error);
    res.status(500).json({ error: 'Failed to send invitations' });
  }
});

// Accept invitation
router.post('/accept/:token', [
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').isLength({ min: 1 }).withMessage('First name is required'),
  body('lastName').isLength({ min: 1 }).withMessage('Last name is required'),
  body('phone').optional().isMobilePhone()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { token } = req.params;
    const { password, firstName, lastName, phone } = req.body;

    // Find invitation
    const invitations = await supabaseService.select('invitations', {
      where: { invitation_token: token, status: 'pending' }
    });

    if (!invitations || invitations.length === 0) {
      return res.status(404).json({ error: 'Invalid or expired invitation' });
    }

    const invitation = invitations[0];

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Check if user already exists with this email
    const existingUser = await supabaseService.getUserByEmail(invitation.email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists. Please login instead.' });
    }

    // Create user account
    const AuthService = require('../services/auth');
    const user = await AuthService.createUser({
      email: invitation.email,
      password,
      firstName: firstName || invitation.first_name,
      lastName: lastName || invitation.last_name,
      phone: phone || invitation.phone,
      role: invitation.role
    });

    // Add user as exchange participant
    await supabaseService.createExchangeParticipant({
      id: uuidv4(),
      exchange_id: invitation.exchange_id,
      user_id: user.id,
      role: invitation.role,
      permissions: invitationService.getDefaultPermissions(invitation.role),
      status: 'active',
      invited_by: invitation.invited_by,
      invited_at: invitation.created_at,
      accepted_at: new Date().toISOString()
    });

    // Mark invitation as accepted
    await supabaseService.update('invitations', 
      { 
        status: 'accepted', 
        accepted_at: new Date().toISOString(),
        user_id: user.id
      }, 
      { id: invitation.id }
    );

    // Generate tokens for immediate login
    const { token: authToken, refreshToken } = AuthService.generateTokens(user);

    // Get exchange details
    const exchange = await supabaseService.getExchangeById(invitation.exchange_id);

    res.json({
      success: true,
      message: 'Account created and invitation accepted successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role
      },
      token: authToken,
      refreshToken,
      exchange: {
        id: exchange.id,
        name: exchange.name || exchange.exchange_number,
        role: invitation.role
      }
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({ error: 'Failed to accept invitation' });
  }
});

// Get invitation details (for signup page)
router.get('/details/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Find invitation
    const invitations = await supabaseService.select('invitations', {
      where: { invitation_token: token, status: 'pending' }
    });

    if (!invitations || invitations.length === 0) {
      return res.status(404).json({ error: 'Invalid invitation' });
    }

    const invitation = invitations[0];

    // Check if expired
    if (new Date(invitation.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Get exchange and inviter details
    const exchange = await supabaseService.getExchangeById(invitation.exchange_id);
    const inviter = await supabaseService.getUserById(invitation.invited_by);

    res.json({
      email: invitation.email,
      firstName: invitation.first_name,
      lastName: invitation.last_name,
      role: invitation.role,
      customMessage: invitation.custom_message,
      exchange: {
        id: exchange.id,
        name: exchange.name || exchange.exchange_number,
        exchangeNumber: exchange.exchange_number
      },
      inviter: {
        name: inviter.first_name ? `${inviter.first_name} ${inviter.last_name}` : inviter.email
      },
      expiresAt: invitation.expires_at
    });

  } catch (error) {
    console.error('Error fetching invitation details:', error);
    res.status(500).json({ error: 'Failed to fetch invitation details' });
  }
});

// Get pending invitations for an exchange
router.get('/:exchangeId', authenticateToken, requireRole(['admin', 'coordinator']), async (req, res) => {
  try {
    const { exchangeId } = req.params;

    // Verify user has access to this exchange
    const exchange = await supabaseService.getExchangeById(exchangeId);
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }

    const userRole = req.user.role;
    const isCoordinator = exchange.coordinator_id === req.user.id;
    
    if (userRole !== 'admin' && !isCoordinator) {
      return res.status(403).json({ error: 'Not authorized to view invitations for this exchange' });
    }

    // Get pending invitations
    const invitations = await supabaseService.select('invitations', {
      where: { exchange_id: exchangeId },
      orderBy: { column: 'created_at', ascending: false }
    });

    // Get inviter details
    const inviterIds = [...new Set(invitations.map(inv => inv.invited_by))];
    const inviters = {};
    
    if (inviterIds.length > 0) {
      const inviterUsers = await supabaseService.select('users', {
        where: { id: inviterIds }
      });
      
      inviterUsers.forEach(user => {
        inviters[user.id] = user.first_name ? `${user.first_name} ${user.last_name}` : user.email;
      });
    }

    const enrichedInvitations = invitations.map(inv => ({
      id: inv.id,
      email: inv.email,
      phone: inv.phone,
      role: inv.role,
      status: inv.status,
      firstName: inv.first_name,
      lastName: inv.last_name,
      customMessage: inv.custom_message,
      invitedBy: inviters[inv.invited_by] || 'Unknown',
      invitedAt: inv.created_at,
      expiresAt: inv.expires_at,
      acceptedAt: inv.accepted_at
    }));

    res.json({
      invitations: enrichedInvitations,
      total: invitations.length,
      pending: invitations.filter(inv => inv.status === 'pending').length,
      accepted: invitations.filter(inv => inv.status === 'accepted').length,
      expired: invitations.filter(inv => inv.status === 'expired').length
    });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
});

// Resend invitation
router.post('/:invitationId/resend', authenticateToken, requireRole(['admin', 'coordinator']), async (req, res) => {
  try {
    const { invitationId } = req.params;

    // Get invitation
    const invitations = await supabaseService.select('invitations', {
      where: { id: invitationId }
    });

    if (!invitations || invitations.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = invitations[0];

    if (invitation.status !== 'pending') {
      return res.status(400).json({ error: 'Can only resend pending invitations' });
    }

    // Verify user has access to this exchange
    const exchange = await supabaseService.getExchangeById(invitation.exchange_id);
    const userRole = req.user.role;
    const isCoordinator = exchange.coordinator_id === req.user.id;
    
    if (userRole !== 'admin' && !isCoordinator) {
      return res.status(403).json({ error: 'Not authorized to resend this invitation' });
    }

    // Generate new token and extend expiry
    const newToken = invitationService.generateInvitationToken();
    const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Update invitation
    await supabaseService.update('invitations',
      {
        invitation_token: newToken,
        expires_at: newExpiresAt.toISOString()
      },
      { id: invitation.id }
    );

    // Get inviter name
    const inviter = await supabaseService.getUserById(invitation.invited_by);

    // Resend invitation
    await invitationService.sendInvitation({
      email: invitation.email,
      phone: invitation.phone,
      method: 'email', // Default to email for resend
      invitationToken: newToken,
      exchangeName: exchange.name || exchange.exchange_number,
      inviterName: inviter.first_name ? `${inviter.first_name} ${inviter.last_name}` : inviter.email,
      role: invitation.role,
      firstName: invitation.first_name,
      lastName: invitation.last_name,
      customMessage: invitation.custom_message,
      isResend: true
    });

    res.json({
      success: true,
      message: 'Invitation resent successfully',
      newExpiresAt: newExpiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error resending invitation:', error);
    res.status(500).json({ error: 'Failed to resend invitation' });
  }
});

// Cancel/delete invitation
router.delete('/:invitationId', authenticateToken, requireRole(['admin', 'coordinator']), async (req, res) => {
  try {
    const { invitationId } = req.params;

    // Get invitation
    const invitations = await supabaseService.select('invitations', {
      where: { id: invitationId }
    });

    if (!invitations || invitations.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const invitation = invitations[0];

    // Verify user has access to this exchange
    const exchange = await supabaseService.getExchangeById(invitation.exchange_id);
    const userRole = req.user.role;
    const isCoordinator = exchange.coordinator_id === req.user.id;
    
    if (userRole !== 'admin' && !isCoordinator) {
      return res.status(403).json({ error: 'Not authorized to cancel this invitation' });
    }

    // Update invitation status instead of deleting
    await supabaseService.update('invitations',
      {
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: req.user.id
      },
      { id: invitation.id }
    );

    res.json({
      success: true,
      message: 'Invitation cancelled successfully'
    });

  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({ error: 'Failed to cancel invitation' });
  }
});

module.exports = router;