const { User } = require('../models');

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  async sendNotification(userId, notification) {
    try {
      // Send real-time notification
      this.io.to(`user:${userId}`).emit('notification', notification);
      
      // Store notification in database (if needed)
      // await Notification.create({
      //   user_id: userId,
      //   title: notification.title,
      //   message: notification.message,
      //   type: notification.type
      // });
      
      return true;
    } catch (error) {
      console.error('Error sending notification:', error);
      return false;
    }
  }

  async sendExchangeNotification(exchangeId, notification) {
    try {
      // Get all users involved in the exchange
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

      // Send notification to all users
      users.forEach(user => {
        this.sendNotification(user.id, {
          ...notification,
          exchangeId
        });
      });
    } catch (error) {
      console.error('Error sending exchange notification:', error);
    }
  }

  async sendTaskNotification(taskId, notification) {
    try {
      const task = await Task.findByPk(taskId, {
        include: [
          { model: User, as: 'assignedUser' }
        ]
      });

      if (task && task.assignedUser) {
        this.sendNotification(task.assignedUser.id, {
          ...notification,
          taskId
        });
      }
    } catch (error) {
      console.error('Error sending task notification:', error);
    }
  }
}

module.exports = NotificationService; 