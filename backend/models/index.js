const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Contact = require('./Contact');
const Exchange = require('./Exchange');
const ExchangeParticipant = require('./ExchangeParticipant');
const Task = require('./Task');
const Document = require('./Document');
const Message = require('./Message');
const AuditLog = require('./AuditLog');
const PracticePartnerSync = require('./PracticePartnerSync');
const Folder = require('./Folder');

// Create models object
const models = {
  User,
  Contact,
  Exchange,
  ExchangeParticipant,
  Task,
  Document,
  Message,
  AuditLog,
  PracticePartnerSync,
  Folder,
  sequelize,
  Sequelize
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Define associations manually
function defineAssociations() {
  // User associations
  // Removed contact_id association as it doesn't exist in the database
  User.hasMany(Exchange, { 
    foreignKey: 'coordinator_id', 
    as: 'coordinatedExchanges' 
  });
  User.hasMany(Task, { 
    foreignKey: 'assigned_to', 
    as: 'assignedTasks' 
  });
  User.hasMany(Document, { 
    foreignKey: 'uploadedBy', 
    as: 'uploadedDocuments' 
  });
  User.hasMany(Message, { 
    foreignKey: 'sender_id', 
    as: 'sentMessages' 
  });
  User.hasMany(AuditLog, { 
    foreignKey: 'user_id', 
    as: 'auditLogs' 
  });
  User.hasMany(Contact, { 
    foreignKey: 'userId', 
    as: 'contacts' 
  });
  User.hasMany(Folder, { 
    foreignKey: 'createdBy', 
    as: 'createdFolders' 
  });

  // Contact associations
  Contact.belongsTo(User, { 
    foreignKey: 'userId', 
    as: 'user' 
  });
  Contact.hasMany(Exchange, { 
    foreignKey: 'client_id', 
    as: 'clientExchanges' 
  });

  // Exchange associations
  Exchange.belongsTo(Contact, { 
    foreignKey: 'client_id', 
    as: 'client' 
  });
  Exchange.belongsTo(User, { 
    foreignKey: 'coordinator_id', 
    as: 'coordinator' 
  });
  Exchange.hasMany(Task, { 
    foreignKey: 'exchange_id', 
    as: 'tasks' 
  });
  Exchange.hasMany(Document, { 
    foreignKey: 'exchangeId', 
    as: 'exchangeDocuments' 
  });
  Exchange.hasMany(Message, { 
    foreignKey: 'exchange_id', 
    as: 'messages' 
  });
  Exchange.hasMany(ExchangeParticipant, { 
    foreignKey: 'exchange_id', 
    as: 'exchangeParticipants' 
  });
  Exchange.hasMany(Folder, { 
    foreignKey: 'exchangeId', 
    as: 'folders' 
  });

  // Folder associations
  Folder.belongsTo(Folder, { 
    foreignKey: 'parentId', 
    as: 'parent' 
  });
  Folder.hasMany(Folder, { 
    foreignKey: 'parentId', 
    as: 'children' 
  });
  Folder.belongsTo(Exchange, { 
    foreignKey: 'exchangeId', 
    as: 'exchange' 
  });
  Folder.belongsTo(User, { 
    foreignKey: 'createdBy', 
    as: 'creator' 
  });
  Folder.hasMany(Document, { 
    foreignKey: 'folderId', 
    as: 'documents' 
  });

  // Document associations
  Document.belongsTo(Exchange, { 
    foreignKey: 'exchangeId', 
    as: 'exchange' 
  });
  Document.belongsTo(User, { 
    foreignKey: 'uploadedBy', 
    as: 'uploadedByUser' 
  });
  Document.belongsTo(Folder, { 
    foreignKey: 'folderId', 
    as: 'folder' 
  });
}

// Call the association function
defineAssociations();

// Export models object
module.exports = models;