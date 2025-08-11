const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Folder = sequelize.define('Folder', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'folders',
      key: 'id'
    }
  },
  exchangeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'exchanges',
      key: 'id'
    }
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'folders',
  timestamps: true,
  underscored: true
});

module.exports = Folder;
