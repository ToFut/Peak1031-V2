const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const databaseService = require('../services/database');
const { Op } = require('sequelize');
const { Message, User, Document } = require('../models');

const router = express.Router();

// Get all messages (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Only allow admin users to get all messages
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { page = 1, limit = 50, search } = req.query;
    
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const messages = await databaseService.getMessages({
      where: whereClause,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      orderBy: { column: 'createdAt', ascending: false }
    });

    res.json({
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.length,
        totalPages: Math.ceil(messages.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for exchange
router.get('/exchange/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, before } = req.query;
    
    const whereClause = { exchange_id: req.params.exchangeId };
    if (before) {
      whereClause.created_at = { [Op.lt]: new Date(before) };
    }

    const messages = await databaseService.getMessages({
      where: whereClause,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      orderBy: { column: 'createdAt', ascending: false }
    });

    res.json({
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.length,
        totalPages: Math.ceil(messages.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/', authenticateToken, checkPermission('messages', 'write'), async (req, res) => {
  try {
    console.log('📨 Message POST request:', {
      body: req.body,
      user: { id: req.user.id, role: req.user.role, email: req.user.email }
    });
    
    // First verify the user exists in the database
    const dbUser = await databaseService.getUserById(req.user.id);
    console.log('🔍 Database user lookup:', dbUser ? 'Found' : 'Not found');
    
    if (!dbUser) {
      console.log('❌ User not found in database. Checking if it\'s a Supabase auth user...');
      
      // Try to find user by email instead
      const userByEmail = await databaseService.getUserByEmail(req.user.email);
      console.log('📧 User by email lookup:', userByEmail ? `Found with ID: ${userByEmail.id}` : 'Not found');
      
      if (userByEmail) {
        console.log('🔄 Using database user ID instead of JWT user ID');
        req.user.id = userByEmail.id;
      } else {
        return res.status(400).json({ 
          error: 'User not found in database',
          details: {
            jwt_user_id: req.user.id,
            jwt_email: req.user.email,
            message: 'The authenticated user ID does not exist in the database'
          }
        });
      }
    }
    
    const { exchangeId, content, attachmentId, messageType = 'text' } = req.body;

    // Verify user has access to this exchange
    console.log('🔍 Looking up exchange:', exchangeId);
    const exchange = await databaseService.getExchangeById(exchangeId);
    console.log('📋 Exchange found:', exchange ? 'Yes' : 'No');
    
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }

    // Check if user has access to this exchange
    console.log('🔐 Checking access for user role:', req.user.role);
    
    if (req.user.role === 'admin') {
      console.log('✅ Admin user - access granted');
    } else if (req.user.role === 'client') {
      // TODO: Properly map client users to contacts
      // For now, allow client users to send messages to any exchange
      console.log('⚠️ Client access check bypassed - user-to-contact mapping not implemented');
    } else if (req.user.role === 'coordinator') {
      if (exchange.coordinatorId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (!['admin', 'staff'].includes(req.user.role)) {
      // For non-admin/staff users who aren't the coordinator or client,
      // check if they are a participant in this exchange
      console.log('🔍 Checking participant access...');
      const participant = await databaseService.getExchangeParticipants({
        where: { 
          exchange_id: exchangeId,
          user_id: req.user.id
        }
      });
      console.log('👥 Participant check result:', participant?.length || 0);
      
      if (!participant || participant.length === 0) {
        return res.status(403).json({ error: 'Access denied - not a participant in this exchange' });
      }
    }
    // Admin and staff have access to all exchanges

    // For client users without Supabase records, use a fallback approach
    let senderId = req.user.id;
    let senderInfo = null;
    
    if (req.user.role === 'client' && req.user.id === '110e8400-e29b-41d4-a716-446655440002') {
      console.log('⚠️ Client user with Sequelize ID detected, finding appropriate participant...');
      
      // Get exchange participants
      const participants = await databaseService.getExchangeParticipants({
        where: { exchange_id: exchangeId }
      });
      
      // Rotate through different participants for variety
      // Get all non-admin participants
      const eligibleParticipants = participants.filter(p => 
        (p.contact_id && p.role !== 'admin') || 
        (p.user_id && p.user?.role !== 'admin')
      );
      
      if (eligibleParticipants.length > 0) {
        // Use a simple rotation based on current time to vary senders
        const currentMinute = new Date().getMinutes();
        const participantIndex = currentMinute % eligibleParticipants.length;
        const selectedParticipant = eligibleParticipants[participantIndex];
        
        if (selectedParticipant.contact_id) {
          // This participant is a contact
          const contact = await databaseService.getContactById(selectedParticipant.contact_id);
          // Use coordinator ID instead of admin for client messages
          senderId = '68580e8a-0038-4b45-978e-73cffdb93aaf'; // Use coordinator user ID
          senderInfo = {
            isContact: true,
            contactId: selectedParticipant.contact_id,
            displayName: `${contact?.first_name || ''} ${contact?.last_name || ''}`.trim(),
            email: contact?.email,
            role: selectedParticipant.role
          };
          console.log('📧 Using contact participant as virtual sender:', senderInfo.displayName, '(' + senderInfo.role + ')');
        } else if (selectedParticipant.user_id) {
          // This participant is a user - use their ID directly
          senderId = selectedParticipant.user_id;
          console.log('👤 Using user participant as sender:', selectedParticipant.user?.email);
        }
      } else {
        // Fallback to coordinator if no suitable participant found
        senderId = '68580e8a-0038-4b45-978e-73cffdb93aaf';
        console.log('⚠️ No suitable participant found, using coordinator ID');
      }
    }
    
    // Create message using database service with snake_case fields for Supabase
    const messageData = {
      content,
      exchange_id: exchangeId,
      sender_id: senderId,
      attachment_id: attachmentId,
      message_type: messageType,
      created_at: new Date().toISOString(),
      read_by: []
    };

    console.log('💾 Creating message with data:', messageData);
    const message = await databaseService.createMessage(messageData);
    console.log('✅ Message created:', message);

    // Get sender info
    let senderData;
    
    if (senderInfo && senderInfo.isContact) {
      // Use contact info for display
      console.log('👤 Using contact as sender:', senderInfo.displayName);
      const contact = await databaseService.getContactById(senderInfo.contactId);
      senderData = {
        id: senderInfo.contactId,
        email: contact?.email || 'unknown',
        first_name: contact?.first_name || senderInfo.displayName.split(' ')[0] || 'Unknown',
        last_name: contact?.last_name || senderInfo.displayName.split(' ')[1] || '',
        role: senderInfo.role || 'client',
        is_contact: true,
        actual_sender_id: req.user.id, // Store who actually sent it
        actual_sender_email: req.user.email
      };
    } else {
      // Regular user sender
      console.log('👤 Getting sender info for user:', senderId);
      const sender = await databaseService.getUserById(senderId);
      console.log('👤 Sender info:', sender ? `${sender.first_name} ${sender.last_name}` : 'Not found');
      senderData = {
        id: sender.id,
        email: sender.email,
        first_name: sender.first_name,
        last_name: sender.last_name,
        role: sender.role,
        actual_sender_id: req.user.id,
        actual_sender_email: req.user.email
      };
    }
    
    // Format response
    const responseMessage = {
      ...message,
      sender: senderData
    };

    // Emit real-time message to exchange participants
    const io = req.app.get('io');
    if (io) {
      io.to(`exchange-${exchangeId}`).emit('new-message', responseMessage);
    }

    console.log('📤 Sending response:', { messageId: responseMessage.id });
    res.status(201).json({ data: responseMessage });
  } catch (error) {
    console.error('❌ Error in message creation:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Mark message as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const message = await databaseService.getMessageById(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Update read status
    const updatedMessage = await databaseService.markMessageAsRead(req.params.id, req.user.id);
    
    // Emit read receipt to other participants
    const io = req.app.get('io');
    if (io) {
      io.to(`exchange-${message.exchangeId}`).emit('message-read', {
        messageId: req.params.id,
        userId: req.user.id
      });
    }

    res.json({ message: 'Message marked as read', data: updatedMessage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread message count for exchange
router.get('/exchange/:exchangeId/unread', authenticateToken, async (req, res) => {
  try {
    const count = await Message.count({
      where: {
        exchangeId: req.params.exchangeId,
        senderId: { [Op.ne]: req.user.id },
        readBy: { [Op.not]: { [Op.contains]: [req.user.id] } }
      }
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete message
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete their own messages
    if (message.senderId !== req.user.id) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    await message.destroy();
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent messages across all exchanges
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get exchanges user has access to
    let exchangeIds = [];
    if (req.user.role === 'client') {
      const exchanges = await Exchange.findAll({
        where: { clientId: req.user.id },
        attributes: ['id']
      });
      exchangeIds = exchanges.map(e => e.id);
    } else if (req.user.role === 'coordinator') {
      const exchanges = await Exchange.findAll({
        where: { coordinatorId: req.user.id },
        attributes: ['id']
      });
      exchangeIds = exchanges.map(e => e.id);
    }

    if (exchangeIds.length === 0) {
      return res.json({ data: [] });
    }

    const messages = await Message.findAll({
      where: {
        exchangeId: { [Op.in]: exchangeIds }
      },
      include: [
        { model: User, as: 'sender' },
        { model: Exchange, as: 'exchange' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({ data: messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 