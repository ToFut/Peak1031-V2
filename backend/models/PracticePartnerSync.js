const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PracticePartnerSync = sequelize.define('PracticePartnerSync', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  syncId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  syncType: {
    type: DataTypes.ENUM('full', 'incremental', 'manual'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'running', 'completed', 'failed', 'partial'),
    defaultValue: 'pending'
  },
  startTime: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: true
  },
  statistics: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalRecords: 0,
      importedRecords: 0,
      updatedRecords: 0,
      skippedRecords: 0,
      errorRecords: 0
    }
  },
  errors: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  config: {
    type: DataTypes.JSONB,
    defaultValue: {
      lastSyncTime: null,
      syncInterval: 30,
      enabled: true
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'practice_partner_syncs',
  timestamps: true,
  underscored: true
});

module.exports = PracticePartnerSync; 