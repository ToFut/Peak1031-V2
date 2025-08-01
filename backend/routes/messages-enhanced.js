const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const databaseService = require('../services/database');
const supabaseService = require('../services/supabase');
const { Op } = require('sequelize');
const crypto = require('crypto');
const { Message, User, Exchange, ExchangeParticipant } = require('../models');

const router = express.Router();

// Helper function to check if user can access exchange
async function canUserAccessExchange(userId, exchangeId, userRole) {
  try {
    // Admins and coordinators can access all exchanges
    if (userRole === 'admin' || userRole === 'coordinator') {
      return true;
    }

    // Check if user is a participant in the exchange via Supabase first
    if (supabaseService.client) {
      try {
        const participants = await supabaseService.select('exchange_participants', {
          where: { 
            exchange_id: exchangeId,
            user_id: userId
          }
        });
        
        if (participants && participants.length > 0) {
          return true;
        }
      } catch (supabaseError) {
        console.log('Checking local database for participant access');
      }
    }

    // Fallback to local database
    const participant = await ExchangeParticipant.findOne({
      where: {
        exchangeId,
        userId
      }
    });

    return !!participant;
  } catch (error) {
    console.error('Error checking exchange access:', error);
    return false;
  }
}

// Encrypt message content for security
function encryptMessage(content) {
  const algorithm = 'aes-256-gcm';
  const key = Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY || 'default-key-change-this-in-production'.padEnd(32).slice(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(content, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

// Decrypt message content
function decryptMessage(encryptedData) {
  try {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.MESSAGE_ENCRYPTION_KEY || 'default-key-change-this-in-production'.padEnd(32).slice(0, 32));
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(encryptedData.iv, 'hex'));
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Error decrypting message:', error);
    return '[Encrypted Message]';
  }
}

// Get all messages (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Only allow admin users to get all messages
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { page = 1, limit = 50, search } = req.query;
    
    // Try Supabase first
    if (supabaseService.client) {
      try {
        const messages = await supabaseService.select('messages', {
          select: `
            *,
            users!messages_sender_id_fkey (
              id,
              first_name,
              last_name,
              email
            ),
            exchanges (
              id,
              name,
              exchange_number
            )
          `,
          limit: parseInt(limit),
          offset: (page - 1) * limit,
          orderBy: { column: 'created_at', ascending: false }
        });

        // Decrypt messages
        const decryptedMessages = messages.map(msg => ({
          ...msg,
          content: msg.encrypted_content ? 
            decryptMessage({
              encrypted: msg.encrypted_content,
              iv: msg.encryption_iv,
              authTag: msg.auth_tag
            }) : msg.content
        }));

        res.json({
          data: decryptedMessages,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: messages.length,
            totalPages: Math.ceil(messages.length / limit)
          }
        });
        return;
      } catch (supabaseError) {
        console.log('Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const messages = await Message.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: Exchange, attributes: ['id', 'name', 'exchangeNumber'] }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      data: messages.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.count,
        totalPages: Math.ceil(messages.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for exchange
router.get('/exchange/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { page = 1, limit = 50, before } = req.query;

    // Check if user has access to this exchange
    const hasAccess = await canUserAccessExchange(req.user.id, exchangeId, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied. You are not a participant in this exchange.' });
    }

    // Try Supabase first
    if (supabaseService.client) {
      try {
        const messages = await supabaseService.select('messages', {
          select: `
            *,
            users!messages_sender_id_fkey (
              id,
              first_name,
              last_name,
              email,
              role
            ),
            documents!messages_attachment_id_fkey (
              id,
              filename,
              mime_type,
              file_size
            )
          `,
          where: { exchange_id: exchangeId },
          limit: parseInt(limit),
          offset: (page - 1) * limit,
          orderBy: { column: 'created_at', ascending: false }
        });

        // Decrypt messages
        const decryptedMessages = messages.map(msg => ({
          ...msg,
          content: msg.encrypted_content ? 
            decryptMessage({
              encrypted: msg.encrypted_content,
              iv: msg.encryption_iv,
              authTag: msg.auth_tag
            }) : msg.content,
          sender: msg.users,
          attachment: msg.documents
        }));

        // Mark messages as read by this user
        const unreadMessages = decryptedMessages.filter(msg => 
          !msg.read_by?.includes(req.user.id) && msg.sender_id !== req.user.id
        );

        if (unreadMessages.length > 0) {
          await Promise.all(unreadMessages.map(msg => 
            supabaseService.update('messages', {
              read_by: [...(msg.read_by || []), req.user.id]
            }, { id: msg.id })
          ));
        }

        res.json({
          data: decryptedMessages,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: decryptedMessages.length
          }
        });
        return;
      } catch (supabaseError) {
        console.log('Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const whereClause = { exchangeId };
    if (before) {
      whereClause.createdAt = { [Op.lt]: new Date(before) };
    }

    const messages = await Message.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }
      ],
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.length
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send a message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { exchangeId, content, attachmentId } = req.body;

    if (!content || !exchangeId) {
      return res.status(400).json({ error: 'Content and exchangeId are required' });
    }

    // Check if user has access to this exchange
    const hasAccess = await canUserAccessExchange(req.user.id, exchangeId, req.user.role);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied. You are not a participant in this exchange.' });
    }

    // Encrypt the message content
    const encryptedData = encryptMessage(content);

    // Try Supabase first
    if (supabaseService.client) {
      try {
        const messageData = {
          content: content, // Store plain text for searching
          encrypted_content: encryptedData.encrypted,
          encryption_iv: encryptedData.iv,
          auth_tag: encryptedData.authTag,
          exchange_id: exchangeId,
          sender_id: req.user.id,
          message_type: attachmentId ? 'file' : 'text',
          attachment_id: attachmentId || null,
          read_by: [req.user.id], // Sender has read their own message
          created_at: new Date().toISOString()
        };

        const message = await supabaseService.createMessage(messageData);

        // Get the full message with sender info
        const fullMessage = await supabaseService.select('messages', {
          select: `
            *,
            users!messages_sender_id_fkey (
              id,
              first_name,
              last_name,
              email,
              role
            )
          `,
          where: { id: message.id }
        });

        // Emit socket event to notify other users
        if (req.app.locals.io) {
          req.app.locals.io.to(`exchange:${exchangeId}`).emit('new_message', {
            ...fullMessage[0],
            content: content, // Send decrypted content to connected users
            sender: fullMessage[0].users
          });

          // Send notifications to offline users
          await notifyOfflineUsers(exchangeId, fullMessage[0], req.user.id);
        }

        res.json({ 
          data: {
            ...fullMessage[0],
            content: content,
            sender: fullMessage[0].users
          }
        });
        return;
      } catch (supabaseError) {
        console.log('Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const message = await Message.create({
      content,
      exchangeId,
      senderId: req.user.id,
      messageType: attachmentId ? 'file' : 'text',
      attachmentId
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }
      ]
    });

    // Emit socket event
    if (req.app.locals.io) {
      req.app.locals.io.to(`exchange:${exchangeId}`).emit('new_message', fullMessage);
    }

    res.json({ data: fullMessage });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
router.put('/read', authenticateToken, async (req, res) => {
  try {
    const { messageIds } = req.body;

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds array is required' });
    }

    // Try Supabase first
    if (supabaseService.client) {
      try {
        // Get messages to verify access
        const messages = await supabaseService.select('messages', {
          where: { id: messageIds }
        });

        // Verify user has access to all messages
        for (const msg of messages) {
          const hasAccess = await canUserAccessExchange(req.user.id, msg.exchange_id, req.user.role);
          if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to one or more messages' });
          }
        }

        // Update read_by array for each message
        await Promise.all(messages.map(msg => {
          const readBy = msg.read_by || [];
          if (!readBy.includes(req.user.id)) {
            readBy.push(req.user.id);
            return supabaseService.update('messages', {
              read_by: readBy
            }, { id: msg.id });
          }
        }));

        res.json({ success: true });
        return;
      } catch (supabaseError) {
        console.log('Falling back to local database:', supabaseError.message);
      }
    }

    // For local database, we'd need to add a read_by field to track this
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a message (sender only within 5 minutes)
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Try Supabase first
    if (supabaseService.client) {
      try {
        const messages = await supabaseService.select('messages', {
          where: { id: messageId }
        });

        if (!messages || messages.length === 0) {
          return res.status(404).json({ error: 'Message not found' });
        }

        const message = messages[0];

        // Check if user is the sender
        if (message.sender_id !== req.user.id) {
          return res.status(403).json({ error: 'You can only delete your own messages' });
        }

        // Check if message is less than 5 minutes old
        const messageAge = Date.now() - new Date(message.created_at).getTime();
        const fiveMinutes = 5 * 60 * 1000;
        if (messageAge > fiveMinutes) {
          return res.status(403).json({ error: 'Messages can only be deleted within 5 minutes' });
        }

        await supabaseService.delete('messages', { id: messageId });

        // Emit socket event
        if (req.app.locals.io) {
          req.app.locals.io.to(`exchange:${message.exchange_id}`).emit('message_deleted', messageId);
        }

        res.json({ success: true });
        return;
      } catch (supabaseError) {
        console.log('Falling back to local database:', supabaseError.message);
      }
    }

    // Fallback to local database
    const message = await Message.findByPk(messageId);
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.senderId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own messages' });
    }

    await message.destroy();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread message count for user
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    // Try Supabase first
    if (supabaseService.client) {
      try {
        // Get all exchanges user is part of
        const participantExchanges = await supabaseService.select('exchange_participants', {
          where: { user_id: req.user.id }
        });

        const exchangeIds = participantExchanges.map(p => p.exchange_id);

        if (exchangeIds.length === 0) {
          return res.json({ data: { count: 0 } });
        }

        // Get unread messages in those exchanges
        const messages = await supabaseService.select('messages', {
          where: { exchange_id: exchangeIds }
        });

        const unreadCount = messages.filter(msg => 
          msg.sender_id !== req.user.id && 
          (!msg.read_by || !msg.read_by.includes(req.user.id))
        ).length;

        res.json({ data: { count: unreadCount } });
        return;
      } catch (supabaseError) {
        console.log('Falling back to local count:', supabaseError.message);
      }
    }

    // Fallback - return 0 for now
    res.json({ data: { count: 0 } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to notify offline users
async function notifyOfflineUsers(exchangeId, message, senderId) {
  try {
    // Get all participants in the exchange
    const participants = await supabaseService.select('exchange_participants', {
      where: { exchange_id: exchangeId }
    });

    // Get user details for participants
    const userIds = participants.map(p => p.user_id).filter(id => id !== senderId);
    
    if (userIds.length > 0) {
      const users = await supabaseService.select('users', {
        where: { id: userIds }
      });

      // Here you would implement email/SMS notifications
      // For now, just log
      console.log(`Notifying ${users.length} users about new message in exchange ${exchangeId}`);
    }
  } catch (error) {
    console.error('Error notifying offline users:', error);
  }
}

module.exports = router;