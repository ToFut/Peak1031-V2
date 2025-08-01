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
  User.hasMany(Exchange, { 
    foreignKey: 'coordinator_id', 
    as: 'coordinatedExchanges' 
  });
  User.hasMany(Task, { 
    foreignKey: 'assigned_to', 
    as: 'assignedTasks' 
  });
  User.hasMany(Document, { 
    foreignKey: 'uploaded_by', 
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

  // Contact associations
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
    foreignKey: 'exchange_id', 
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

  // Task associations
  Task.belongsTo(Exchange, { 
    foreignKey: 'exchange_id', 
    as: 'exchange' 
  });
  Task.belongsTo(User, { 
    foreignKey: 'assigned_to', 
    as: 'assignedUser' 
  });

  // Document associations
  Document.belongsTo(Exchange, { 
    foreignKey: 'exchange_id', 
    as: 'exchange' 
  });
  Document.belongsTo(User, { 
    foreignKey: 'uploaded_by', 
    as: 'uploader' 
  });
  Document.hasMany(Message, { 
    foreignKey: 'attachment_id', 
    as: 'attachedMessages' 
  });

  // Message associations
  Message.belongsTo(Exchange, { 
    foreignKey: 'exchange_id', 
    as: 'exchange' 
  });
  Message.belongsTo(User, { 
    foreignKey: 'sender_id', 
    as: 'sender' 
  });
  Message.belongsTo(Document, { 
    foreignKey: 'attachment_id', 
    as: 'attachment' 
  });

  // ExchangeParticipant associations
  ExchangeParticipant.belongsTo(Exchange, { 
    foreignKey: 'exchange_id', 
    as: 'exchange' 
  });
  ExchangeParticipant.belongsTo(Contact, { 
    foreignKey: 'contact_id', 
    as: 'contact' 
  });
  ExchangeParticipant.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });

  // AuditLog associations
  AuditLog.belongsTo(User, { 
    foreignKey: 'user_id', 
    as: 'user' 
  });
}

// Call the association function
defineAssociations();

// Export models object
module.exports = models;