const { Message, User, Exchange, ExchangeParticipant, Contact } = require('../models');
const supabaseService = require('./supabase');
const notificationService = require('./notifications');

class EnhancedMessageService {
  constructor(io) {
    this.io = io;
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    if (!this.io) return;

    this.io.on('connection', async (socket) => {
      console.log(`User connected: ${socket.userId}`);

      // Join user's personal room for notifications
      socket.join(`user:${socket.userId}`);

      // Handle joining exchange rooms
      socket.on('join_exchange', async (exchangeId) => {
        const canAccess = await this.canAccessExchange(socket.userId, exchangeId);
        if (canAccess) {
          socket.join(`exchange:${exchangeId}`);
          console.log(`User ${socket.userId} joined exchange ${exchangeId}`);
          
          // Notify others that user is online
          socket.to(`exchange:${exchangeId}`).emit('user_online', {
            userId: socket.userId,
            exchangeId
          });
        }
      });

      // Handle leaving exchange rooms
      socket.on('leave_exchange', (exchangeId) => {
        socket.leave(`exchange:${exchangeId}`);
        
        // Notify others that user left
        socket.to(`exchange:${exchangeId}`).emit('user_offline', {
          userId: socket.userId,
          exchangeId
        });
      });

      // Handle typing indicators
      socket.on('typing_start', async (data) => {
        const { exchangeId } = data;
        const canAccess = await this.canAccessExchange(socket.userId, exchangeId);
        if (canAccess) {
          socket.to(`exchange:${exchangeId}`).emit('user_typing', {
            userId: socket.userId,
            exchangeId,
            userName: socket.userName
          });
        }
      });

      socket.on('typing_stop', async (data) => {
        const { exchangeId } = data;
        const canAccess = await this.canAccessExchange(socket.userId, exchangeId);
        if (canAccess) {
          socket.to(`exchange:${exchangeId}`).emit('user_stopped_typing', {
            userId: socket.userId,
            exchangeId
          });
        }
      });

      // Handle message sending via socket
      socket.on('send_message', async (data) => {
        try {
          const { exchangeId, content, attachmentId } = data;
          const canAccess = await this.canAccessExchange(socket.userId, exchangeId);
          
          if (!canAccess) {
            socket.emit('error', { message: 'Access denied to this exchange' });
            return;
          }

          const message = await this.createMessage({
            content,
            exchangeId,
            senderId: socket.userId,
            attachmentId
          });

          // Emit to all users in the exchange
          this.io.to(`exchange:${exchangeId}`).emit('new_message', message);

          // Send notifications to offline users
          await this.notifyOfflineUsers(exchangeId, message, socket.userId);

        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.userId}`);
        
        // Notify all exchanges the user was in
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room.startsWith('exchange:')) {
            const exchangeId = room.replace('exchange:', '');
            socket.to(room).emit('user_offline', {
              userId: socket.userId,
              exchangeId
            });
          }
        });
      });
    });
  }

  async canAccessExchange(userId, exchangeId) {
    try {
      // Try Supabase first
      if (supabaseService.client) {
        try {
          // Check user role
          const user = await supabaseService.getUserById(userId);
          if (!user) return false;

          // Admins and coordinators have access to all exchanges
          if (user.role === 'admin' || user.role === 'coordinator') {
            return true;
          }

          // Check if user is the assigned coordinator
          const exchange = await supabaseService.getExchangeById(exchangeId);
          if (exchange && exchange.coordinator_id === userId) {
            return true;
          }

          // Check exchange participants
          const participants = await supabaseService.select('exchange_participants', {
            where: {
              exchange_id: exchangeId,
              user_id: userId
            }
          });

          if (participants && participants.length > 0) {
            return true;
          }

          // Check if user is linked via contact
          const contactParticipants = await supabaseService.select('exchange_participants', {
            where: {
              exchange_id: exchangeId
            }
          });

          // Get user's associated contact
          const contacts = await supabaseService.select('contacts', {
            where: { email: user.email }
          });

          if (contacts && contacts.length > 0) {
            const userContactIds = contacts.map(c => c.id);
            const isContactParticipant = contactParticipants.some(p => 
              userContactIds.includes(p.contact_id)
            );
            
            if (isContactParticipant) {
              return true;
            }
          }

          return false;
        } catch (supabaseError) {
          console.log('Falling back to local database for access check:', supabaseError.message);
        }
      }

      // Fallback to local database
      const user = await User.findByPk(userId);
      if (!user) return false;

      if (user.role === 'admin' || user.role === 'coordinator') {
        return true;
      }

      const exchange = await Exchange.findByPk(exchangeId);
      if (exchange && exchange.coordinatorId === userId) {
        return true;
      }

      const participant = await ExchangeParticipant.findOne({
        where: { exchangeId, userId }
      });

      return !!participant;
    } catch (error) {
      console.error('Error checking exchange access:', error);
      return false;
    }
  }

  async createMessage(data) {
    try {
      const { content, exchangeId, senderId, attachmentId } = data;

      // Encrypt sensitive content
      const encryptedContent = this.encryptContent(content);

      // Try Supabase first
      if (supabaseService.client) {
        try {
          const messageData = {
            content: content, // Store for searching
            encrypted_content: encryptedContent.encrypted,
            encryption_iv: encryptedContent.iv,
            auth_tag: encryptedContent.authTag,
            exchange_id: exchangeId,
            sender_id: senderId,
            message_type: attachmentId ? 'file' : 'text',
            attachment_id: attachmentId,
            read_by: [senderId],
            created_at: new Date().toISOString()
          };

          const message = await supabaseService.createMessage(messageData);

          // Get full message with relations
          const fullMessages = await supabaseService.select('messages', {
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
            where: { id: message.id }
          });

          return {
            ...fullMessages[0],
            content: content, // Return decrypted content
            sender: fullMessages[0].users,
            attachment: fullMessages[0].documents
          };
        } catch (supabaseError) {
          console.log('Falling back to local database:', supabaseError.message);
        }
      }

      // Fallback to local database
      const message = await Message.create({
        content,
        exchangeId,
        senderId,
        messageType: attachmentId ? 'file' : 'text',
        attachmentId
      });

      const populatedMessage = await Message.findByPk(message.id, {
        include: [
          { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }
        ]
      });

      return populatedMessage;
    } catch (error) {
      console.error('Error creating message:', error);
      throw error;
    }
  }

  async notifyOfflineUsers(exchangeId, message, senderId) {
    try {
      // Get all participants
      let participants = [];
      
      if (supabaseService.client) {
        try {
          const exchangeParticipants = await supabaseService.select('exchange_participants', {
            where: { exchange_id: exchangeId }
          });

          // Get user details
          const userIds = exchangeParticipants
            .filter(p => p.user_id && p.user_id !== senderId)
            .map(p => p.user_id);

          if (userIds.length > 0) {
            participants = await supabaseService.select('users', {
              where: { id: userIds }
            });
          }

          // Also get contact-based participants
          const contactIds = exchangeParticipants
            .filter(p => p.contact_id)
            .map(p => p.contact_id);

          if (contactIds.length > 0) {
            const contacts = await supabaseService.select('contacts', {
              where: { id: contactIds }
            });

            // Find users associated with these contacts
            const contactEmails = contacts.map(c => c.email);
            const contactUsers = await supabaseService.select('users', {
              where: { email: contactEmails }
            });

            participants = [...participants, ...contactUsers];
          }
        } catch (supabaseError) {
          console.log('Error getting participants from Supabase:', supabaseError);
        }
      }

      // Send notifications
      for (const participant of participants) {
        if (participant.id === senderId) continue;

        // Check if user is online
        const userSocket = this.getUserSocket(participant.id);
        if (!userSocket) {
          // User is offline, send notification
          await notificationService.sendNewMessageNotification({
            userId: participant.id,
            userEmail: participant.email,
            userName: `${participant.first_name} ${participant.last_name}`,
            exchangeId,
            message: {
              content: message.content,
              senderName: `${message.sender.first_name} ${message.sender.last_name}`
            }
          });
        }
      }
    } catch (error) {
      console.error('Error notifying offline users:', error);
    }
  }

  getUserSocket(userId) {
    // Check if user is connected
    const sockets = this.io.sockets.sockets;
    for (const [socketId, socket] of sockets) {
      if (socket.userId === userId) {
        return socket;
      }
    }
    return null;
  }

  encryptContent(content) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(
      process.env.MESSAGE_ENCRYPTION_KEY || 
      'default-key-change-this-in-production'.padEnd(32).slice(0, 32)
    );
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

  async getExchangeMessages(exchangeId, userId, options = {}) {
    try {
      // Verify access
      const hasAccess = await this.canAccessExchange(userId, exchangeId);
      if (!hasAccess) {
        throw new Error('Access denied to this exchange');
      }

      const { limit = 50, offset = 0 } = options;

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
            orderBy: { column: 'created_at', ascending: false },
            limit,
            offset
          });

          // Decrypt content
          const decryptedMessages = messages.map(msg => ({
            ...msg,
            content: this.decryptContent({
              encrypted: msg.encrypted_content,
              iv: msg.encryption_iv,
              authTag: msg.auth_tag
            }),
            sender: msg.users,
            attachment: msg.documents
          }));

          return decryptedMessages;
        } catch (supabaseError) {
          console.log('Falling back to local database:', supabaseError.message);
        }
      }

      // Fallback to local database
      const messages = await Message.findAll({
        where: { exchangeId },
        include: [
          { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset
      });

      return messages;
    } catch (error) {
      console.error('Error getting exchange messages:', error);
      throw error;
    }
  }

  decryptContent(encryptedData) {
    try {
      const crypto = require('crypto');
      const algorithm = 'aes-256-gcm';
      const key = Buffer.from(
        process.env.MESSAGE_ENCRYPTION_KEY || 
        'default-key-change-this-in-production'.padEnd(32).slice(0, 32)
      );
      const decipher = crypto.createDecipheriv(
        algorithm, 
        key, 
        Buffer.from(encryptedData.iv, 'hex')
      );
      
      decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
      
      let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Error decrypting message:', error);
      return '[Encrypted Message]';
    }
  }
}

module.exports = EnhancedMessageService;