const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  exchangeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'exchanges',
      key: 'id'
    }
  },
  senderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  attachmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'documents',
      key: 'id'
    }
  },
  messageType: {
    type: DataTypes.ENUM('text', 'file', 'system'),
    allowNull: false,
    defaultValue: 'text'
  },
  readBy: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  }
}, {
  tableName: 'messages',
  timestamps: true,
  underscored: true
});

// Instance methods
Message.prototype.markAsRead = function(userId) {
  if (!this.readBy.includes(userId)) {
    this.readBy.push(userId);
    return this.save();
  }
  return Promise.resolve(this);
};

Message.prototype.isReadBy = function(userId) {
  return this.readBy.includes(userId);
};

Message.prototype.getReadCount = function() {
  return this.readBy.length;
};

module.exports = Message; 