const databaseService = require('./database');
const rbacService = require('./rbacService');

class MessageService {
  constructor(io) {
    this.io = io;
  }

  async canAccessExchange(userId, exchangeId) {
    try {
      console.log(`🔍 MessageService: Checking access for user ${userId} to exchange ${exchangeId}`);
      
      // Find user using database service
      const user = await databaseService.getUserById(userId);
      if (!user) {
        console.log(`❌ MessageService: User ${userId} not found`);
        return false;
      }

      console.log(`👤 MessageService: User found - ${user.email} (${user.role})`);

      // Find the exchange
      const exchange = await databaseService.getExchangeById(exchangeId);
      if (!exchange) {
        console.log(`❌ MessageService: Exchange ${exchangeId} not found`);
        return false;
      }

      console.log(`📋 MessageService: Exchange found - ${exchange.name || exchange.exchange_name}`);

      // Admins have access to all exchanges
      if (user.role === 'admin') {
        console.log(`✅ MessageService: Admin access granted for ${user.email}`);
        return true;
      }

      // Coordinators have access to all exchanges
      if (user.role === 'coordinator') {
        console.log(`✅ MessageService: Coordinator access granted for ${user.email}`);
        return true;
      }

      // Check if user is the assigned coordinator for this exchange
      if (exchange.coordinator_id === userId) {
        console.log(`✅ MessageService: Coordinator of this exchange - access granted`);
        return true;
      }

      // For clients, check if they have access through RBAC
      if (user.role === 'client') {
        try {
          const userExchanges = await rbacService.getExchangesForUser(user);
          const hasAccess = userExchanges.data?.some(ex => ex.id === exchangeId);
          
          if (hasAccess) {
            console.log(`✅ MessageService: Client has RBAC access to exchange`);
            return true;
          } else {
            console.log(`❌ MessageService: Client does not have RBAC access to exchange`);
            return false;
          }
        } catch (rbacError) {
          console.error('MessageService: RBAC check failed:', rbacError);
          return false;
        }
      }

      // Check if user is a participant in the exchange
      const participants = await databaseService.getExchangeParticipants({
        where: { 
          exchange_id: exchangeId,
          contact_id: user.contact_id || user.id
        }
      });
      
      if (participants && participants.length > 0) {
        console.log(`✅ MessageService: User is participant - access granted`);
        return true;
      }

      console.log(`❌ MessageService: Access denied - user is not admin, coordinator, or participant`);
      return false;
    } catch (error) {
      console.error('MessageService: Error checking exchange access:', error);
      return false;
    }
  }

  async createMessage(data) {
    try {
      console.log(`💬 MessageService: Creating message for exchange ${data.exchangeId}`);
      
      // Create message using database service
      const messageData = {
        content: data.content,
        exchange_id: data.exchangeId,
        sender_id: data.senderId,
        message_type: data.messageType || 'text',
        attachment_id: data.attachmentId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const message = await databaseService.createMessage(messageData);
      
      // Get sender information
      const sender = await databaseService.getUserById(data.senderId);
      
      if (message) {
        message.sender = sender;
        console.log(`✅ MessageService: Message created with ID ${message.id}`);
      }

      return message;
    } catch (error) {
      console.error('MessageService: Error creating message:', error);
      throw error;
    }
  }

  async notifyOfflineUsers(exchangeId, message, senderId) {
    try {
      console.log(`🔔 MessageService: Notifying offline users for exchange ${exchangeId}`);
      
      // Get the exchange
      const exchange = await databaseService.getExchangeById(exchangeId);
      if (!exchange) {
        console.log(`❌ MessageService: Exchange ${exchangeId} not found for notifications`);
        return;
      }

      // Get all participants
      const participants = await databaseService.getExchangeParticipants({
        where: { exchange_id: exchangeId }
      });

      const users = [];
      
      // Add coordinator if exists
      if (exchange.coordinator_id) {
        const coordinator = await databaseService.getUserById(exchange.coordinator_id);
        if (coordinator) users.push(coordinator);
      }

      // Add participants
      if (participants) {
        for (const participant of participants) {
          if (participant.contact_id && participant.contact_id !== senderId) {
            const user = await databaseService.getUserById(participant.contact_id);
            if (user) users.push(user);
          }
        }
      }

      console.log(`🔔 MessageService: Found ${users.length} users to notify`);

      // Send notification to offline users
      users.forEach(user => {
        if (user.id !== senderId) {
          console.log(`📢 MessageService: Sending notification to user ${user.email}`);
          this.io.emit(`notification:${user.id}`, {
            type: 'new_message',
            exchangeId,
            message: {
              id: message.id,
              content: message.content,
              sender: message.sender
            }
          });
        }
      });
    } catch (error) {
      console.error('Error notifying offline users:', error);
    }
  }

  async markMessageRead(messageId, userId) {
    try {
      console.log(`👁️ MessageService: Marking message ${messageId} as read by user ${userId}`);
      
      const message = await databaseService.getMessages({
        where: { id: messageId },
        limit: 1
      });
      
      if (!message || message.length === 0) {
        console.log(`❌ MessageService: Message ${messageId} not found`);
        return;
      }

      const messageRecord = message[0];
      const readBy = messageRecord.read_by || [];
      
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        await databaseService.updateMessage(messageId, { read_by: readBy });
        console.log(`✅ MessageService: Message ${messageId} marked as read by ${userId}`);
      }
    } catch (error) {
      console.error('MessageService: Error marking message as read:', error);
    }
  }

  async getMessages(exchangeId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      console.log(`📥 MessageService: Getting messages for exchange ${exchangeId}`);
      
      const messages = await databaseService.getMessages({
        where: { exchange_id: exchangeId },
        limit,
        offset,
        orderBy: { column: 'created_at', ascending: false }
      });

      // Add sender information to messages
      for (const message of messages) {
        if (message.sender_id) {
          const sender = await databaseService.getUserById(message.sender_id);
          if (sender) {
            message.sender = {
              id: sender.id,
              firstName: sender.first_name,
              lastName: sender.last_name,
              email: sender.email
            };
          }
        }
      }

      console.log(`✅ MessageService: Retrieved ${messages.length} messages`);
      return messages;
    } catch (error) {
      console.error('MessageService: Error getting messages:', error);
      throw error;
    }
  }
}

module.exports = MessageService; 