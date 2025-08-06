const { Message, User, Exchange, Contact } = require('../models');

class MessageService {
  constructor(io) {
    this.io = io;
  }

  async canAccessExchange(userId, exchangeId) {
    try {
      // Find user to get their role
      const user = await User.findByPk(userId);
      if (!user) return false;

      // Find the exchange with related data
      const exchange = await Exchange.findByPk(exchangeId, {
        include: [
          { model: User, as: 'coordinator' },
          { model: Contact, as: 'client' }
        ]
      });
      
      if (!exchange) return false;

      // Admins and coordinators have access to all exchanges
      if (user.role === 'admin' || user.role === 'coordinator') {
        return true;
      }

      // Check if user is the assigned coordinator for this exchange
      if (exchange.coordinatorId === userId) {
        return true;
      }

      // TODO: Check if user is a participant in the exchange
      // This would query the exchange_participants table
      // For now, restrict access to admin/coordinator only for security

      return false;
    } catch (error) {
      console.error('Error checking exchange access:', error);
      return false;
    }
  }

  async createMessage(data) {
    try {
      const message = await Message.create({
        content: data.content,
        exchange_id: data.exchangeId,
        sender_id: data.senderId,
        message_type: data.messageType || 'text',
        attachment_id: data.attachmentId
      });

      // Populate sender information
      const populatedMessage = await Message.findByPk(message.id, {
        include: [
          { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email'] }
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
      // Get all users in the exchange
      const exchange = await Exchange.findByPk(exchangeId, {
        include: [
          { model: User, as: 'coordinator' },
          { model: User, as: 'client' }
        ]
      });

      if (!exchange) return;

      const users = [];
      if (exchange.coordinator) users.push(exchange.coordinator);
      if (exchange.client) users.push(exchange.client);

      // Send notification to offline users
      users.forEach(user => {
        if (user.id !== senderId) {
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
      const message = await Message.findByPk(messageId);
      if (!message) return;

      const readBy = message.read_by || [];
      if (!readBy.includes(userId)) {
        readBy.push(userId);
        await message.update({ read_by: readBy });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  async getMessages(exchangeId, options = {}) {
    try {
      const { limit = 50, offset = 0 } = options;
      
      return await Message.findAll({
        where: { exchange_id: exchangeId },
        include: [
          { model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
      });
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }
}

module.exports = MessageService; 