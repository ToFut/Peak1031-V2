const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  action: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  entityType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  entityId: {
    type: DataTypes.UUID,
    allowNull: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  ipAddress: {
    type: DataTypes.INET,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'audit_logs',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      fields: ['user_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['action']
    },
    {
      fields: ['entity_type', 'entity_id']
    }
  ]
});

// Static methods
AuditLog.log = function(action, userId, details = {}, entityType = null, entityId = null, req = null) {
  const logData = {
    action,
    userId,
    details,
    entityType,
    entityId
  };

  if (req) {
    logData.ipAddress = req.ip || req.connection.remoteAddress;
    logData.userAgent = req.get('User-Agent');
  }

  return AuditLog.create(logData);
};

module.exports = AuditLog; 