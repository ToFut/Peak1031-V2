const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ExchangeParticipant = sequelize.define('ExchangeParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  
  exchange_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'exchanges',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
    comment: 'Exchange ID'
  },
  
  contact_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'contacts',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'Contact ID (for external participants)'
  },
  
  user_id: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
    comment: 'User ID (for internal participants)'
  },
  
  role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 50]
    },
    comment: 'Participant role (e.g., "client", "coordinator", "advisor")'
  },
  
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: 'JSON object containing participant permissions'
  }
}, {
  tableName: 'exchange_participants',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['exchange_id', 'contact_id']
    },
    {
      unique: true,
      fields: ['exchange_id', 'user_id']
    },
    {
      fields: ['exchange_id']
    },
    {
      fields: ['contact_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['role']
    }
  ]
});

module.exports = ExchangeParticipant; 