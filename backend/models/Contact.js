const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  ppContactId: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  company: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  ppData: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {}
  },
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'contacts',
  timestamps: true,
  underscored: true
});

// Instance methods
Contact.prototype.getFullName = function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
};

Contact.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  values.fullName = this.getFullName();
  return values;
};

module.exports = Contact; 