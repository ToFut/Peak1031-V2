const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  filename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  originalFilename: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  filePath: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  exchangeId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'exchanges',
      key: 'id'
    }
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  pinRequired: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  pinHash: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  isTemplate: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  templateData: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: 'documents',
  timestamps: true,
  underscored: true
});

// Instance methods
Document.prototype.getFileExtension = function() {
  return this.originalFilename.split('.').pop().toLowerCase();
};

Document.prototype.getFileSizeFormatted = function() {
  if (!this.fileSize) return 'Unknown';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(this.fileSize) / Math.log(1024));
  return Math.round(this.fileSize / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
};

Document.prototype.isImage = function() {
  const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return imageTypes.includes(this.mimeType);
};

Document.prototype.isPDF = function() {
  return this.mimeType === 'application/pdf';
};

module.exports = Document; 