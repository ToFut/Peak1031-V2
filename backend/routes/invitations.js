const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, requireRole } = require('../middleware/auth');
const supabaseService = require('../services/supabase');
const invitationService = require('../services/invitationService');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get pending invitations for current user 
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userEmail = req.user.email;
    
    // Get all pending invitations for this user's email using direct query
    const { data: invitations, error } = await supabaseService.client
      .from('invitations')
      .select(`
        *,
        exchange:exchange_id(id, exchange_name, exchange_number),
        invited_by_user:invited_by(id, first_name, last_name, email)
      `)
      .eq('email', userEmail)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ 
      invitations: invitations || [],
      success: true 
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch invitations',
      invitations: []  
    });
  }
});

// Get sent invitations by current user for a specific exchange
router.get('/sent/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const userId = req.user.id;
    
    // Get all invitations sent by this user for this exchange using direct query
    const { data: invitations, error } = await supabaseService.client
      .from('invitations')
      .select('*')
      .eq('exchange_id', exchangeId)
      .eq('invited_by', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ 
      invitations: invitations || [],
      success: true 
    });
  } catch (error) {
    console.error('Error fetching sent invitations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch sent invitations',
      invitations: []  
    });
  }
});

// Simple send invitation endpoint for compatibility
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { exchange_id, emails, role = 'client', message } = req.body;

    if (!exchange_id || !emails || !emails.length) {
      return res.status(400).json({ error: 'Exchange ID and emails are required' });
    }

    // Get exchange details using direct query
    const { data: exchange, error: exchangeError } = await supabaseService.client
      .from('exchanges')
      .select('*')
      .eq('id', exchange_id)
      .single();
      
    if (exchangeError || !exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }

    const results = [];
    for (const email of emails) {
      try {
        // Create invitation record using direct query
        const crypto = require('crypto');
        const invitationToken = crypto.randomBytes(32).toString('hex'); // Generate proper hex token
        const { data: invitation, error: insertError } = await supabaseService.client
          .from('invitations')
          .insert({
            id: uuidv4(),
            exchange_id,
            email: email.trim(),
            role,
            invited_by: req.user.id,
            custom_message: message || `You've been invited to join the exchange: ${exchange.exchange_name || exchange.exchange_number}`,
            invitation_token: invitationToken,
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            created_at: new Date().toISOString()
          })
          .select()
          .single();
        
        if (insertError) throw insertError;
        
        // Generate invitation link - use correct path for production/local
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const invitationPath = process.env.NODE_ENV === 'production' ? '/invite' : '/onboarding/invitation';
        const invitationLink = `${frontendUrl}${invitationPath}/${invitationToken}`;
        
        results.push({ 
          email, 
          status: 'sent', 
          id: invitation.id,
          invitationLink,
          token: invitationToken
        });
        
        // Send email notification with invitation link using the SAME token
        if (process.env.SENDGRID_API_KEY) {
          const invitationService = require('../services/invitationService');
          await invitationService.sendInvitation({
            email: email.trim(),
            method: 'email',
            invitationToken: invitationToken, // Pass the token we saved
            exchangeName: exchange.exchange_name || exchange.exchange_number,
            inviterName: req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user.email,
            role: role,
            exchangeId: exchange_id,
            inviterId: req.user.id
          });
        } else {
          console.log(`📧 Would send invitation email to ${email} for exchange ${exchange.exchange_name || exchange.exchange_number}`);
          console.log(`   Invitation link: ${invitationLink}`);
        }
      } catch (err) {
        console.error(`Failed to send invitation to ${email}:`, err);
        results.push({ email, status: 'failed', error: err.message });
      }
    }

    const successful = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    res.json({ 
      success: true,
      sent: successful,
      failed,
      message: `Sent ${successful} invitations${failed > 0 ? `, ${failed} failed` : ''}`,
      results
    });

  } catch (error) {
    console.error('Error sending invitations:', error);
    res.status(500).json({ error: 'Failed to send invitations' });
  }
});

// Send invitations to exchange
router.post('/:exchangeId/send', authenticateToken, requireRole(['admin', 'coordinator']), [
  body('invitations').isArray().withMessage('Invitations must be an array'),
  body('invitations.*.email').isEmail().withMessage('Valid email is required'),
  body('invitations.*.role').isIn(['client', 'third_party', 'agency', 'coordinator']).withMessage('Invalid role'),
  body('invitations.*.method').isIn(['email', 'sms', 'both']).withMessage('Invalid invitation method'),
  body('invitations.*.phone').optional({ checkFalsy: true }).custom((value) => {
    if (!value) return true; // Allow empty/optional phone
    // Basic phone validation - allow digits, spaces, dashes, parentheses, and +
    const phoneRegex = /^[\+]?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(value)) {
      throw new Error('Invalid phone number format');
    }
    return true;
  }).withMessage('Invalid phone number format'),
  body('invitations.*.firstName').optional().isString(),
  body('invitations.*.lastName').optional().isString(),
  body('message').optional().isString().isLength({ max: 500 }).withMessage('Message too long')
], async (req, res) => {
  try {
    console.log('📨 Invitation request received:', JSON.stringify(req.body, null, 2));
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
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
    
    console.log('🔐 Authorization check:', {
      userRole,
      isCoordinator,
      exchangeId,
      inviterId,
      exchangeCoordinatorId: exchange.coordinator_id
    });
    
    if (userRole !== 'admin' && !isCoordinator) {
      console.log('❌ Authorization failed: User cannot invite to this exchange');
      return res.status(403).json({ error: 'Not authorized to send invitations for this exchange' });
    }
    
    console.log('✅ Authorization passed: User can invite to this exchange');

    const results = [];
    
    for (const invitation of invitations) {
      try {
        console.log(`🔍 Processing invitation for ${invitation.email}...`);
        
        // Check if user already exists
        const existingUser = await supabaseService.getUserByEmail(invitation.email);
        
        if (existingUser) {
          // User exists - check if already participant
          const existingParticipants = await supabaseService.getExchangeParticipants({
            where: { exchangeId }
          });
          
          // Ensure user has a contact record
          let contactId = existingUser.contact_id;
          
          if (!contactId) {
            // Create a contact record for this user if it doesn't exist
            console.log(`🔗 Creating contact record for existing user: ${existingUser.email}`);
            const contactData = {
              id: uuidv4(),
              first_name: existingUser.first_name || invitation.firstName || 'Unknown',
              last_name: existingUser.last_name || invitation.lastName || 'User',
              email: existingUser.email,
              phone: existingUser.phone || invitation.phone || null,
              contact_type: 'person',
              source: 'user_invitation',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            await supabaseService.insert('contacts', contactData);
            contactId = contactData.id;
            
            // Update user record to link to the new contact
            await supabaseService.update('users', 
              { contact_id: contactId, updated_at: new Date().toISOString() },
              { id: existingUser.id }
            );
            
            console.log(`✅ Created contact ${contactId} and linked to user ${existingUser.id}`);
          }
          
          // Verify the contact exists in the contacts table
          const contactExists = await supabaseService.select('contacts', {
            where: { id: contactId },
            limit: 1
          });
          
          if (!contactExists || contactExists.length === 0) {
            throw new Error(`Contact ${contactId} does not exist in contacts table`);
          }
          
          const isAlreadyParticipant = existingParticipants.some(p => 
            (p.user_id === existingUser.id || p.contact_id === contactId) && 
            p.role === invitation.role && 
            p.is_active !== false
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
          const permissions = invitationService.getDefaultPermissions(invitation.role);
          
          // Get the inviter's contact_id (assigned_by must reference contacts table)
          let inviterContactId = req.user.contact_id;
          
          if (!inviterContactId) {
            // If inviter doesn't have a contact_id, create one
            console.log(`🔗 Creating contact record for inviter: ${req.user.email}`);
            const inviterContactData = {
              id: uuidv4(),
              first_name: req.user.first_name || 'Admin',
              last_name: req.user.last_name || 'User',
              email: req.user.email,
              phone: req.user.phone || null,
              contact_type: 'person',
              source: 'user_system',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            await supabaseService.insert('contacts', inviterContactData);
            inviterContactId = inviterContactData.id;
            
            // Update inviter's user record
            await supabaseService.update('users', 
              { contact_id: inviterContactId, updated_at: new Date().toISOString() },
              { id: req.user.id }
            );
            
            console.log(`✅ Created contact ${inviterContactId} and linked to inviter ${req.user.id}`);
          }
          
          const participantResult = await supabaseService.createExchangeParticipant({
            id: uuidv4(),
            exchange_id: exchangeId,
            contact_id: contactId, // Now guaranteed to be a valid contact_id
            user_id: existingUser.id, // IMPORTANT: Also set user_id for filtering
            role: invitation.role,
            permissions: permissions, // Store as JSONB array
            assigned_by: inviterContactId, // Now guaranteed to be a valid contact_id
            assigned_at: new Date().toISOString(),
            is_active: true
          });
          
          console.log(`✅ Created exchange participant:`, participantResult);
          
          // Create database notification for the invited user
          const notificationData = {
            id: uuidv4(),
            user_id: existingUser.id,
            title: 'You\'ve been added to an exchange!',
            message: `${req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user.email} added you to ${exchange.name || exchange.exchange_number} as a ${invitation.role}`,
            type: 'participant',
            read: false,
            related_exchange_id: exchangeId,
            urgency: 'high',
            created_at: new Date().toISOString()
          };

          try {
            const result = await supabaseService.createNotification(notificationData);
            console.log(`✅ Created database notification for user ${existingUser.id}:`, result);
            
            // Emit immediate socket notification to trigger popup 
            const io = req.app?.get('io');
            if (io) {
              console.log(`📡 Emitting database notification created event to user_${existingUser.id}`);
              io.to(`user_${existingUser.id}`).emit('database_notification_created', {
                notification: {
                  id: result.id || notificationData.id,
                  title: notificationData.title,
                  message: notificationData.message,
                  type: notificationData.type,
                  read: false,
                  created_at: notificationData.created_at,
                  action_url: `/exchanges/${exchangeId}`
                }
              });
            }
          } catch (notificationError) {
            console.error('❌ Failed to create database notification:', notificationError);
            console.error('❌ Notification data was:', notificationData);
            console.error('❌ Full error:', JSON.stringify(notificationError, null, 2));
            // Don't fail the invitation process if notification creation fails
          }
          
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
          
          // Emit real-time notification for existing user being added
          const io = req.app?.get('io');
          if (io) {
            console.log(`📡 Emitting notifications for user ${existingUser.id} (${existingUser.email})`);
            
            // Small delay to ensure database transaction is committed
            setTimeout(() => {
              // Emit immediate invitation notification to the user
              io.to(`user_${existingUser.id}`).emit('invitation_notification', {
                title: 'You\'ve been added to an exchange!',
                message: `${req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user.email} added you to ${exchange.name || exchange.exchange_number} as a ${invitation.role}`,
                exchangeId: exchangeId,
                exchangeName: exchange.name || exchange.exchange_number,
                actionUrl: `/exchanges/${exchangeId}`,
                type: 'info'
              });
              console.log(`✅ Sent invitation_notification to user_${existingUser.id}`);
            }, 100);
            
            // Also emit participant_added with a slight delay to ensure DB consistency  
            setTimeout(() => {
              // Emit to the specific user being added
              io.to(`user_${existingUser.id}`).emit('participant_added', {
                exchangeId: exchangeId,
                participantId: participantResult?.id || 'new-participant',
                participant: {
                  user_id: existingUser.id,
                  contact_id: contactId,
                  role: invitation.role,
                  email: existingUser.email,
                  name: `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim()
                },
                addedBy: req.user.id,
                exchangeName: exchange.name || exchange.exchange_number
              });
              
              // Also emit to exchange room in case user is already connected
              io.to(`exchange_${exchangeId}`).emit('participant_added', {
                exchangeId: exchangeId,
                participantId: participantResult?.id || 'new-participant',
                participant: {
                  user_id: existingUser.id,
                  contact_id: contactId,
                  role: invitation.role,
                  email: existingUser.email,
                  name: `${existingUser.first_name || ''} ${existingUser.last_name || ''}`.trim()
                },
                addedBy: req.user.id,
                exchangeName: exchange.name || exchange.exchange_number
              });
              
              console.log(`✅ Sent participant_added to user_${existingUser.id} and exchange_${exchangeId}`);
            }, 200);
          } else {
            console.warn('⚠️ Socket.IO not available for participant addition notification');
          }
          
          // Create invitation record for existing user to show in pending list
          const crypto = require('crypto');
          const invitationToken = crypto.randomBytes(32).toString('hex');
          
          try {
            const { data: invitationRecord, error: invError } = await supabaseService.client
              .from('invitations')
              .insert({
                id: uuidv4(),
                exchange_id: exchangeId,
                email: invitation.email,
                role: invitation.role,
                invited_by: inviterId,
                invitation_token: invitationToken,
                status: 'auto_accepted', // Special status for existing users
                accepted_at: new Date().toISOString(),
                user_id: existingUser.id,
                custom_message: message || null,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                created_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (!invError && invitationRecord) {
              console.log(`✅ Created invitation record for existing user ${existingUser.email}`);
            }
          } catch (invErr) {
            console.error('Failed to create invitation record:', invErr);
          }
          
          results.push({
            email: invitation.email,
            status: 'added_existing_user',
            message: 'Existing user added to exchange and notified'
          });
          
        } else {
          console.log(`📧 Creating invitation for new user: ${invitation.email}`);
          
          // Create invitation for new user using Supabase Auth
          const crypto = require('crypto');
          const invitationId = uuidv4();
          const invitationToken = crypto.randomBytes(32).toString('hex');
          
          // Send invitation using Supabase Auth - PASS THE TOKEN WE GENERATED
          console.log('📧 Calling invitation service...');
          const inviteResult = await invitationService.sendInvitation({
            email: invitation.email,
            phone: invitation.phone,
            method: invitation.method,
            invitationToken: invitationToken, // USE THE SAME TOKEN WE'LL SAVE TO DB
            exchangeName: exchange.name || exchange.exchange_number,
            inviterName: req.user.first_name ? `${req.user.first_name} ${req.user.last_name}` : req.user.email,
            role: invitation.role,
            firstName: invitation.firstName,
            lastName: invitation.lastName,
            customMessage: message,
            exchangeId: exchangeId,
            inviterId: inviterId
          });
          console.log('📧 Invitation service result:', inviteResult);

          if (inviteResult.email.sent) {
            console.log('📧 Invitation sent successfully, storing record...');
            
            // Store invitation record for tracking
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
            
            try {
              await supabaseService.insert('invitations', {
                id: invitationId,
                email: invitation.email,
                phone: invitation.phone || null,
                exchange_id: exchangeId,
                role: invitation.role,
                invited_by: inviterId,
                invitation_token: invitationToken, // Use the properly generated token
                expires_at: expiresAt.toISOString(),
                status: 'pending',
                first_name: invitation.firstName || null,
                last_name: invitation.lastName || null,
                custom_message: message || null,
                created_at: new Date().toISOString()
                // Remove supabase_user_id as it doesn't exist in the table
              });
              console.log('✅ Invitation record stored successfully');
            } catch (dbError) {
              console.error('❌ Failed to store invitation record:', dbError);
              throw dbError;
            }

            // Generate invitation link
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const invitationPath = process.env.NODE_ENV === 'production' ? '/invite' : '/onboarding/invitation';
            const invitationLink = `${frontendUrl}${invitationPath}/${invitationToken}`;
            
            results.push({
              email: invitation.email,
              status: 'invitation_sent',
              message: 'Invitation sent successfully via Supabase Auth',
              expiresAt: expiresAt.toISOString(),
              invitationLink,
              token: invitationToken,
              invitationId
            });
          } else {
            console.log('❌ Invitation sending failed, but storing for development mode');
            // In development, still create the invitation record even if email fails
            if (process.env.NODE_ENV === 'development' || !process.env.SENDGRID_API_KEY) {
              const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
              
              await supabaseService.insert('invitations', {
                id: invitationId,
                email: invitation.email,
                phone: invitation.phone || null,
                exchange_id: exchangeId,
                role: invitation.role,
                invited_by: inviterId,
                invitation_token: invitationToken, // Use the same token we generated above
                expires_at: expiresAt.toISOString(),
                status: 'pending',
                first_name: invitation.firstName || null,
                last_name: invitation.lastName || null,
                custom_message: message || null,
                created_at: new Date().toISOString()
              });

              results.push({
                email: invitation.email,
                status: 'invitation_sent',
                message: 'Invitation created (email mocked in development)',
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
        }
        
              } catch (error) {
          console.error(`❌ Error processing invitation for ${invitation.email}:`, error);
          console.error(`❌ Error details:`, error.message);
          console.error(`❌ Error stack:`, error.stack);
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
    const permissions = invitationService.getDefaultPermissions(invitation.role);
    
    // Ensure the new user has a contact_id (AuthService should have created this)
    let contactId = user.contact_id;
    
    if (!contactId) {
      // This should not happen if AuthService is working correctly, but as a fallback:
      console.log(`⚠️ Warning: New user ${user.email} doesn't have contact_id, creating one`);
      const contactData = {
        id: uuidv4(),
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone || null,
        contact_type: 'person',
        source: 'user_signup',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await supabaseService.insert('contacts', contactData);
      contactId = contactData.id;
      
      // Update user record to link to the new contact
      await supabaseService.update('users', 
        { contact_id: contactId, updated_at: new Date().toISOString() },
        { id: user.id }
      );
      
      console.log(`✅ Created contact ${contactId} and linked to new user ${user.id}`);
    }
    
    // Get the inviter's contact_id from their user record
    let inviterContactId = null;
    if (invitation.invited_by) {
      const inviter = await supabaseService.getUserById(invitation.invited_by);
      inviterContactId = inviter?.contact_id;
      
      // Ensure inviter has contact_id too
      if (!inviterContactId && inviter) {
        console.log(`🔗 Creating contact record for inviter: ${inviter.email}`);
        const inviterContactData = {
          id: uuidv4(),
          first_name: inviter.first_name || 'Admin',
          last_name: inviter.last_name || 'User',
          email: inviter.email,
          phone: inviter.phone || null,
          contact_type: 'person',
          source: 'user_system',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        await supabaseService.insert('contacts', inviterContactData);
        inviterContactId = inviterContactData.id;
        
        // Update inviter's user record
        await supabaseService.update('users', 
          { contact_id: inviterContactId, updated_at: new Date().toISOString() },
          { id: inviter.id }
        );
        
        console.log(`✅ Created contact ${inviterContactId} and linked to inviter ${inviter.id}`);
      }
    }
    
    await supabaseService.createExchangeParticipant({
      id: uuidv4(),
      exchange_id: invitation.exchange_id,
      contact_id: contactId, // Now guaranteed to be a valid contact_id
      role: invitation.role,
      permissions: permissions, // Store as JSONB array
      assigned_by: inviterContactId, // Now guaranteed to be a valid contact_id or null
      assigned_at: new Date().toISOString(),
      is_active: true
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

// Get all users and invitations for an exchange (combined view)
router.get('/exchange/:exchangeId/users-and-invitations', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    
    // Verify exchange exists and user has access
    const exchange = await supabaseService.getExchangeById(exchangeId);
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }

    // Use the same RBAC logic as other exchange endpoints
    const rbacService = require('../services/rbacService');
    const canAccess = await rbacService.canUserAccessExchange(req.user, exchangeId);
    
    if (!canAccess) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to view participants for this exchange'
      });
    }

    // Get current participants using the same approach as working endpoint
    const { data: participants, error: participantsError } = await supabaseService.client
      .from('exchange_participants')
      .select('*')
      .eq('exchange_id', exchangeId)
      .eq('is_active', true);

    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
    }

    // Get all invitations for this exchange
    const { data: invitations, error: invitationsError } = await supabaseService.client
      .from('invitations')
      .select(`
        id,
        email,
        phone,
        role,
        status,
        first_name,
        last_name,
        custom_message,
        invitation_token,
        expires_at,
        created_at,
        accepted_at,
        invited_by_user:invited_by(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('exchange_id', exchangeId)
      .order('created_at', { ascending: false });

    if (invitationsError) {
      console.error('Error fetching invitations:', invitationsError);
    }

    // Debug logging
    console.log('🔍 Raw participants data:', JSON.stringify(participants, null, 2));
    console.log('🔍 Raw invitations data:', JSON.stringify(invitations, null, 2));

    // Get contact/user details separately (following the working pattern)
    let formattedParticipants = [];
    
    if (participants && participants.length > 0) {
      // Get unique contact and user IDs
      const contactIds = [...new Set(participants.map(p => p.contact_id).filter(Boolean))];
      const userIds = [...new Set(participants.map(p => p.user_id).filter(Boolean))];
      
      // Fetch contact details
      let contacts = [];
      if (contactIds.length > 0) {
        const { data: contactData } = await supabaseService.client
          .from('people')
          .select('id, first_name, last_name, email, phone')
          .in('id', contactIds);
        contacts = contactData || [];
      }
      
      // Fetch user details  
      let users = [];
      if (userIds.length > 0) {
        const { data: userData } = await supabaseService.client
          .from('users')
          .select('id, first_name, last_name, email, phone, role')
          .in('id', userIds);
        users = userData || [];
      }
      
      // Format participants with enriched data
      formattedParticipants = await Promise.all(participants.map(async (participant) => {
        let name = 'Unknown';
        let email = '';
        let phone = '';
        let firstName = '';
        let lastName = '';
        
        // Try user data first (more reliable)
        if (participant.user_id) {
          const user = users.find(u => u.id === participant.user_id);
          if (user) {
            firstName = user.first_name || '';
            lastName = user.last_name || '';
            name = `${firstName} ${lastName}`.trim() || 'Unknown';
            email = user.email || '';
            phone = user.phone || '';
          }
        }
        
        // Fallback to contact data if no user found
        if (name === 'Unknown' && participant.contact_id) {
          const contact = contacts.find(c => c.id === participant.contact_id);
          if (contact) {
            firstName = contact.first_name || '';
            lastName = contact.last_name || '';
            name = `${firstName} ${lastName}`.trim() || 'Unknown';
            email = contact.email || '';
            phone = contact.phone || '';
          }
        }
        
        // Parse permissions if they're stored as JSON string
        let parsedPermissions = {};
        if (participant.permissions) {
          try {
            parsedPermissions = typeof participant.permissions === 'string' 
              ? JSON.parse(participant.permissions) 
              : participant.permissions;
          } catch (error) {
            console.error('Error parsing permissions for participant:', participant.id, error);
          }
        }

        return {
          id: participant.id,
          type: 'participant',
          status: 'active',
          role: participant.role,
          permissions: parsedPermissions,
          assignedAt: participant.assigned_at,
          
          // User info
          userId: participant.user_id,
          contactId: participant.contact_id,
          firstName,
          lastName,
          name,
          email,
          phone,
          
          // For compatibility with existing UI
          assignedBy: null // We can add this later if needed
        };
      }));
    }

    console.log('🔍 Final participants count:', formattedParticipants.length);
    console.log('🔍 Participants data:', JSON.stringify(formattedParticipants, null, 2));

    // Format invitations data
    const formattedInvitations = (invitations || []).map(inv => {
      const invitedBy = inv.invited_by_user;

      return {
        id: inv.id,
        type: 'invitation',
        status: inv.status,
        role: inv.role,
        
        // Invitation info
        email: inv.email,
        phone: inv.phone,
        firstName: inv.first_name,
        lastName: inv.last_name,
        customMessage: inv.custom_message,
        invitationToken: inv.invitation_token,
        expiresAt: inv.expires_at,
        createdAt: inv.created_at,
        acceptedAt: inv.accepted_at,
        
        // Inviter info
        invitedBy: invitedBy ? {
          id: invitedBy.id,
          name: `${invitedBy.first_name || ''} ${invitedBy.last_name || ''}`.trim() || invitedBy.email,
          email: invitedBy.email
        } : null
      };
    });

    // Calculate summary statistics
    const stats = {
      totalParticipants: formattedParticipants.length,
      totalInvitations: formattedInvitations.length,
      pendingInvitations: formattedInvitations.filter(inv => inv.status === 'pending').length,
      acceptedInvitations: formattedInvitations.filter(inv => inv.status === 'accepted').length,
      expiredInvitations: formattedInvitations.filter(inv => inv.status === 'expired').length,
      
      // Role breakdown for participants
      roleBreakdown: formattedParticipants.reduce((acc, p) => {
        acc[p.role] = (acc[p.role] || 0) + 1;
        return acc;
      }, {})
    };

    res.json({
      success: true,
      exchangeId,
      participants: formattedParticipants,
      invitations: formattedInvitations,
      stats,
      total: formattedParticipants.length + formattedInvitations.length
    });

  } catch (error) {
    console.error('Error fetching exchange users and invitations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch exchange users and invitations',
      participants: [],
      invitations: [],
      stats: {}
    });
  }
});


module.exports = router;