const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Task = sequelize.define('Task', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ppTaskId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED'),
    allowNull: false,
    defaultValue: 'PENDING'
  },
  priority: {
    type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH'),
    allowNull: false,
    defaultValue: 'MEDIUM'
  },
  exchangeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'exchanges',
      key: 'id'
    }
  },
  assignedTo: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  ppData: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'tasks',
  timestamps: true,
  underscored: true
});

// Instance methods
Task.prototype.getStatusColor = function() {
  const statusColors = {
    'PENDING': 'yellow',
    'IN_PROGRESS': 'blue',
    'COMPLETED': 'green'
  };
  return statusColors[this.status] || 'gray';
};

Task.prototype.getPriorityColor = function() {
  const priorityColors = {
    'LOW': 'green',
    'MEDIUM': 'yellow',
    'HIGH': 'red'
  };
  return priorityColors[this.priority] || 'gray';
};

Task.prototype.isOverdue = function() {
  if (!this.dueDate || this.status === 'COMPLETED') {
    return false;
  }
  return new Date(this.dueDate) < new Date();
};

module.exports = Task; 