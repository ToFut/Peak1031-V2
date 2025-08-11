const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const databaseService = require('../services/database');
const auditService = require('../services/audit');
const messageAgentService = require('../services/messageAgentService');
const { Op } = require('sequelize');
const { Message, User, Document } = require('../models');

const router = express.Router();

// Test endpoint for debugging RBAC
router.get('/test-rbac', authenticateToken, checkPermission('messages', 'read'), async (req, res) => {
  console.log('🧪 RBAC test endpoint reached with user:', {
    id: req.user.id,
    email: req.user.email,
    role: req.user.role
  });
  res.json({ message: 'RBAC test passed', user: req.user.email, role: req.user.role });
});

// Get all messages (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📥 GET /messages - Admin only');
    
    // Only allow admin users to get all messages
    if (req.user.role !== 'admin') {
      console.log('❌ Access denied - not admin:', req.user.role);
      return res.status(403).json({ 
        success: false,
        error: 'Access denied. Admin only.' 
      });
    }

    const { page = 1, limit = 50, search } = req.query;
    
    const whereClause = {};
    if (search) {
      whereClause.content = search; // Will be converted to ilike in service
    }

    console.log('🔍 Fetching all messages with where:', whereClause);
    const messages = await databaseService.getMessages({
      where: whereClause,
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit),
      orderBy: { column: 'created_at', ascending: false }
    });

    console.log('✅ Found', messages.length, 'messages');
    
    // Log audit trail
    await auditService.logUserAction(
      req.user.id,
      'view_all_messages',
      'message',
      null,
      req,
      { messageCount: messages.length, search }
    );

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.length,
        totalPages: Math.ceil(messages.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching all messages:', error);
    console.error('Stack trace:', error.stack);
    
    // Log error for audit
    await auditService.log({
      action: 'ERROR',
      userId: req.user?.id,
      resourceType: 'message',
      details: {
        error: error.message,
        endpoint: '/messages'
      }
    });
    
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get messages for exchange
router.get('/exchange/:exchangeId', authenticateToken, async (req, res) => {
  try {
    console.log('📥 GET /messages/exchange/' + req.params.exchangeId);
    const { page = 1, limit = 50, before } = req.query;
    const exchangeId = req.params.exchangeId;
    
    // Verify user has access to this exchange
    const exchange = await databaseService.getExchangeById(exchangeId);
    if (!exchange) {
      console.log('❌ Exchange not found:', exchangeId);
      return res.status(404).json({ error: 'Exchange not found' });
    }
    
    // Check access permissions
    console.log('🔐 User role check:', { 
      userId: req.user.id, 
      role: req.user.role,
      email: req.user.email,
      isAdmin: req.user.role === 'admin'
    });
    
    let hasAccess = false;
    if (req.user.role === 'admin' || req.user.role === 'staff') {
      hasAccess = true;
      console.log('✅ Admin/Staff access granted');
    } else if (req.user.role === 'coordinator' && exchange.coordinator_id === req.user.id) {
      hasAccess = true;
    } else {
      // Check if user is a participant
      const participants = await databaseService.getExchangeParticipants({
        where: { exchange_id: exchangeId, user_id: req.user.id }
      });
      hasAccess = participants && participants.length > 0;
    }
    
    if (!hasAccess) {
      console.log('❌ Access denied for user:', req.user.id, 'to exchange:', exchangeId);
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Use correct field name for Supabase
    const whereClause = { exchangeId }; // This will be converted to exchange_id in the service
    if (before) {
      whereClause.created_at = { lt: new Date(before) };
    }

    console.log('🔍 Fetching messages with where:', whereClause);
    const messages = await databaseService.getMessages({
      where: whereClause,
      limit: parseInt(limit),
      offset: (page - 1) * parseInt(limit),
      orderBy: { column: 'created_at', ascending: false }
    });

    console.log('✅ Found', messages.length, 'messages');
    
    // Log audit trail
    await auditService.logUserAction(
      req.user.id,
      'view_messages',
      'exchange',
      exchangeId,
      req,
      { messageCount: messages.length }
    );

    res.json({
      success: true,
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.length,
        totalPages: Math.ceil(messages.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching exchange messages:', error);
    console.error('Stack trace:', error.stack);
    
    // Log error for audit
    await auditService.log({
      action: 'ERROR',
      userId: req.user?.id,
      resourceType: 'message',
      details: {
        error: error.message,
        exchangeId: req.params.exchangeId,
        endpoint: '/messages/exchange/:exchangeId'
      }
    });
    
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Send message
router.post('/', authenticateToken, checkPermission('messages', 'write'), async (req, res) => {
  try {
    console.log('📨 Message POST request reached main handler:', {
      body: req.body,
      user: { id: req.user.id, role: req.user.role, email: req.user.email }
    });
    
    // For now, skip database user verification to allow messages to flow
    // This is a temporary fix until we properly map JWT users to database users
    console.log('📨 Processing message from user:', req.user.email);
    
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

    // Get the user's contact_id for the sender_id field
    console.log('🔍 User object contact_id:', req.user.contact_id);
    let senderId = req.user.contact_id;
    
    // If user doesn't have a contact_id, try to find or create one
    if (!senderId) {
      console.log('⚠️ User has no contact_id, looking up contact by email:', req.user.email);
      const contact = await databaseService.getContacts({
        where: { email: req.user.email },
        limit: 1
      });
      
      if (contact && contact.length > 0) {
        senderId = contact[0].id;
        console.log('✅ Found contact:', senderId);
      } else {
        // Create a contact for this user
        console.log('📝 Creating contact for user:', req.user.email);
        const newContact = await databaseService.createContact({
          id: req.user.id, // Use user ID as contact ID
          firstName: req.user.first_name || req.user.email.split('@')[0],
          lastName: req.user.last_name || '',
          email: req.user.email,
          phone: req.user.phone || '',
          company: 'Peak 1031',
          contactType: 'internal_user',
          isActive: true
        });
        senderId = newContact.id;
        
        // Update user with contact_id
        await databaseService.updateUser(req.user.id, { contact_id: senderId });
        console.log('✅ Created contact and updated user:', senderId);
      }
    }
    
    // Create message using database service with snake_case fields for Supabase
    const messageData = {
      content,
      exchange_id: exchangeId,
      sender_id: senderId, // Now using contact_id
      message_type: messageType,
      created_at: new Date().toISOString(),
      read_by: []
    };

    // Add attachments array if attachmentId is provided
    if (attachmentId) {
      messageData.attachments = [attachmentId];
    }

    console.log('💾 Creating message with data:', messageData);
    const message = await databaseService.createMessage(messageData);
    console.log('✅ Message created:', message);

    // Process special message commands (@TASK, @ADD, etc.)
    let agentResults = { taskCreated: null, contactAdded: null, errors: [] };
    if (content.includes('@TASK') || content.includes('@ADD')) {
      try {
        console.log('🤖 Message agent detected special commands...');
        agentResults = await messageAgentService.processMessage(content, exchangeId, req.user.id, message);
        
        // Log any successful agent actions
        if (agentResults.taskCreated) {
          await auditService.logUserAction(
            req.user.id,
            'auto_create_task',
            'task',
            agentResults.taskCreated.id,
            req,
            { 
              sourceMessageId: message.id,
              taskTitle: agentResults.taskCreated.title,
              priority: agentResults.taskCreated.priority,
              agent: 'messageAgent'
            }
          );
        }

        if (agentResults.contactAdded) {
          await auditService.logUserAction(
            req.user.id,
            'auto_add_contact',
            'contact',
            agentResults.contactAdded.contact.id,
            req,
            { 
              sourceMessageId: message.id,
              action: agentResults.contactAdded.action,
              mobile: agentResults.contactAdded.mobile,
              agent: 'messageAgent'
            }
          );
        }
      } catch (agentError) {
        console.error('❌ Error in message agent processing:', agentError);
        // Don't fail the message creation if agent processing fails
        agentResults.errors.push(agentError.message);
      }
    }

    // Log the message creation for audit
    await auditService.logUserAction(
      req.user.id,
      'send_message',
      'message',
      message.id,
      req,
      { 
        exchangeId, 
        messageType,
        hasAttachment: !!attachmentId,
        attachmentId: attachmentId,
        contentLength: content.length,
        agentResults: agentResults
      }
    );

    // Use the authenticated user info as sender
    const senderData = {
      id: req.user.id,
      email: req.user.email,
      first_name: req.user.first_name || req.user.email.split('@')[0],
      last_name: req.user.last_name || '',
      role: req.user.role
    };
    
    // Format response
    const responseMessage = {
      ...message,
      sender: senderData,
      agentResults: agentResults // Include agent processing results
    };

    // Emit real-time message to exchange participants
    const io = req.app.get('io');
    if (io) {
      console.log(`📡 Emitting message to exchange_${exchangeId} room`);
      // Ensure exchange_id is included in the emitted message
      const socketMessage = {
        ...responseMessage,
        exchange_id: exchangeId
      };
      
      // Emit to multiple room patterns for compatibility
      io.to(`exchange_${exchangeId}`).emit('new_message', socketMessage);
      io.to(`exchange-${exchangeId}`).emit('new_message', socketMessage);
      
      // Also emit to all connected users in the exchange (fallback)
      const participants = await databaseService.getExchangeParticipants({
        where: { exchange_id: exchangeId }
      });
      
      participants.forEach(participant => {
        if (participant.user_id) {
          io.to(`user_${participant.user_id}`).emit('new_message', socketMessage);
        }
      });
    } else {
      console.warn('⚠️ Socket.IO not available for real-time messaging');
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
    console.log('📖 Marking message as read:', req.params.id, 'by user:', req.user.id);
    
    const message = await databaseService.getMessageById(req.params.id);
    
    if (!message) {
      console.log('❌ Message not found:', req.params.id);
      return res.status(404).json({ error: 'Message not found' });
    }

    // Update read status
    const updatedMessage = await databaseService.markMessageAsRead(req.params.id, req.user.id);
    console.log('✅ Message marked as read successfully');
    
    // Emit read receipt to other participants
    const io = req.app.get('io');
    if (io && (message.exchangeId || message.exchange_id)) {
      const exchangeId = message.exchangeId || message.exchange_id;
      io.to(`exchange-${exchangeId}`).emit('message-read', {
        messageId: req.params.id,
        userId: req.user.id
      });
    }

    res.json({ message: 'Message marked as read', data: updatedMessage });
  } catch (error) {
    console.error('❌ Error marking message as read:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to mark message as read',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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