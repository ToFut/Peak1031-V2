const { sequelize, useSupabase } = require('../config/database');
const { Op } = require('sequelize');
const supabaseService = require('./supabase');
const { User, Exchange, Contact, Task, Message, Document, AuditLog, Notification, ExchangeParticipant, Folder } = require('../models');

class DatabaseService {
  constructor() {
    this.useSupabase = useSupabase; // Use the config setting
    console.log('🔧 Database Service: Using', this.useSupabase ? 'Supabase REST API' : 'local SQLite database');
  }

  // User operations
  async getUsers(options = {}) {
    if (this.useSupabase) {
      return await supabaseService.getUsers(options);
    } else {
      return await User.findAll(options);
    }
  }

  async getUserById(id) {
    if (this.useSupabase) {
      return await supabaseService.getUserById(id);
    } else {
      return await User.findByPk(id);
    }
  }

  async getUserByEmail(email) {
    if (this.useSupabase) {
      return await supabaseService.getUserByEmail(email);
    } else {
      return await User.findOne({ where: { email } });
    }
  }

  async createUser(userData) {
    if (this.useSupabase) {
      return await supabaseService.createUser(userData);
    } else {
      return await User.create(userData);
    }
  }

  async updateUser(id, userData) {
    if (this.useSupabase) {
      return await supabaseService.updateUser(id, userData);
    } else {
      const user = await User.findByPk(id);
      if (!user) throw new Error('User not found');
      return await user.update(userData);
    }
  }

  async updateUserPassword(id, currentPassword, newPassword) {
    if (this.useSupabase) {
      return await supabaseService.updateUserPassword(id, currentPassword, newPassword);
    } else {
      const user = await User.findByPk(id);
      if (!user) throw new Error('User not found');
      
      // Verify current password
      const isValidPassword = await user.validatePassword(currentPassword);
      if (!isValidPassword) {
        return false;
      }
      
      // Update password
      await user.update({ passwordHash: newPassword });
      return true;
    }
  }

  // Exchange operations
  async getExchanges(options = {}) {
    if (this.useSupabase) {
      // Pass includeParticipants option to Supabase service
      return await supabaseService.getExchanges(options);
    } else {
      const includeArray = [
        { model: User, as: 'coordinator' },
        { model: Contact, as: 'client' }
      ];
      
      // Add participants if requested
      if (options.includeParticipants) {
        includeArray.push({
          model: ExchangeParticipant, 
          as: 'exchangeParticipants',
          include: [
            { model: User, as: 'user', attributes: { exclude: ['password_hash', 'two_fa_secret'] } },
            { model: Contact, as: 'contact' }
          ]
        });
      }
      
      return await Exchange.findAll({
        ...options,
        include: includeArray
      });
    }
  }

  async getExchangeById(id) {
    if (this.useSupabase) {
      return await supabaseService.getExchangeById(id);
    } else {
      return await Exchange.findByPk(id, {
        include: [
          { model: User, as: 'coordinator' },
          { model: Contact, as: 'client' },
          {
            model: ExchangeParticipant,
            as: 'exchangeParticipants',
            include: [
              { model: User, as: 'user', attributes: { exclude: ['password_hash', 'two_fa_secret'] } },
              { model: Contact, as: 'contact' }
            ]
          }
        ]
      });
    }
  }

  async createExchange(exchangeData) {
    if (this.useSupabase) {
      return await supabaseService.createExchange(exchangeData);
    } else {
      return await Exchange.create(exchangeData);
    }
  }

  async updateExchange(id, exchangeData) {
    if (this.useSupabase) {
      return await supabaseService.updateExchange(id, exchangeData);
    } else {
      const exchange = await Exchange.findByPk(id);
      if (!exchange) throw new Error('Exchange not found');
      return await exchange.update(exchangeData);
    }
  }

  // Contact operations
  async getContacts(options = {}) {
    if (this.useSupabase) {
      try {
        return await supabaseService.getContacts(options);
      } catch (error) {
        console.log('⚠️ Supabase error, falling back to Sequelize for contacts:', error.message);
        return await Contact.findAll(options);
      }
    } else {
      return await Contact.findAll(options);
    }
  }

  async getContactById(id) {
    if (this.useSupabase) {
      return await supabaseService.getContactById(id);
    } else {
      return await Contact.findByPk(id);
    }
  }

  async createContact(contactData) {
    if (this.useSupabase) {
      return await supabaseService.createContact(contactData);
    } else {
      return await Contact.create(contactData);
    }
  }

  async updateContact(id, contactData) {
    if (this.useSupabase) {
      return await supabaseService.updateContact(id, contactData);
    } else {
      const contact = await Contact.findByPk(id);
      if (!contact) throw new Error('Contact not found');
      return await contact.update(contactData);
    }
  }

  // Task operations
  async getTasks(options = {}) {
    if (this.useSupabase) {
      // Convert camelCase column names to snake_case for Supabase
      const supabaseOptions = { ...options };
      if (supabaseOptions.orderBy) {
        const columnMap = {
          'dueDate': 'due_date',
          'createdAt': 'created_at',
          'updatedAt': 'updated_at',
          'assignedTo': 'assigned_to',
          'exchangeId': 'exchange_id',
          'priority': 'priority',
          'status': 'status',
          'title': 'title'
        };
        supabaseOptions.orderBy.column = columnMap[supabaseOptions.orderBy.column] || supabaseOptions.orderBy.column;
      }
      return await supabaseService.getTasks(supabaseOptions);
    }
    
    // Use Sequelize (either as primary or fallback)
    const { orderBy, ...sequelizeOptions } = options;
    if (orderBy) {
      // Convert camelCase to snake_case for database columns
      const columnMap = {
        'dueDate': 'due_date',
        'createdAt': 'created_at',
        'updatedAt': 'updated_at',
        'assignedTo': 'assigned_to',
        'exchangeId': 'exchange_id'
      };
      const dbColumn = columnMap[orderBy.column] || orderBy.column;
      sequelizeOptions.order = [[dbColumn, orderBy.ascending ? 'ASC' : 'DESC']];
    }
    
    return await Task.findAll({
      ...sequelizeOptions,
      include: [
        { model: User, as: 'assignedUser' },
        { model: Exchange, as: 'exchange' }
      ]
    });
  }

  async getTaskById(id) {
    if (this.useSupabase) {
      return await supabaseService.getTaskById(id);
    } else {
      return await Task.findByPk(id, {
        include: [
          { model: User, as: 'assignedUser' },
          { model: Exchange, as: 'exchange' }
        ]
      });
    }
  }

  async createTask(taskData) {
    if (this.useSupabase) {
      return await supabaseService.createTask(taskData);
    } else {
      return await Task.create(taskData);
    }
  }

  async updateTask(id, taskData) {
    if (this.useSupabase) {
      return await supabaseService.updateTask(id, taskData);
    } else {
      const task = await Task.findByPk(id);
      if (!task) throw new Error('Task not found');
      return await task.update(taskData);
    }
  }

  // Message operations
  async getMessages(options = {}) {
    if (this.useSupabase) {
      // Convert camelCase column names to snake_case for Supabase
      const supabaseOptions = { ...options };
      if (supabaseOptions.orderBy) {
        const columnMap = {
          'createdAt': 'created_at',
          'updatedAt': 'updated_at',
          'content': 'content',
          'senderId': 'sender_id',
          'exchangeId': 'exchange_id',
          'attachmentId': 'attachment_id'
        };
        supabaseOptions.orderBy.column = columnMap[supabaseOptions.orderBy.column] || supabaseOptions.orderBy.column;
      }
      return await supabaseService.getMessages(supabaseOptions);
    } else {
      return await Message.findAll({
        ...options,
        include: [
          { model: User, as: 'sender' },
          { model: Document, as: 'attachment' },
          { model: Exchange, as: 'exchange' }
        ],
        order: [['createdAt', 'DESC']]
      });
    }
  }

  async getMessageById(id) {
    if (this.useSupabase) {
      return await supabaseService.getMessageById(id);
    } else {
      return await Message.findByPk(id, {
        include: [
          { model: User, as: 'sender' },
          { model: Document, as: 'attachment' },
          { model: Exchange, as: 'exchange' }
        ]
      });
    }
  }

  async createMessage(messageData) {
    console.log('🗄️ DatabaseService.createMessage called with:', messageData);
    
    if (this.useSupabase) {
      console.log('🔵 Using Supabase to create message');
      const result = await supabaseService.createMessage(messageData);
      console.log('🔵 Supabase createMessage result:', result);
      return result;
    } else {
      console.log('🟢 Using Sequelize to create message');
      return await Message.create(messageData);
    }
  }

  async updateMessage(id, messageData) {
    if (this.useSupabase) {
      return await supabaseService.updateMessage(id, messageData);
    } else {
      const message = await Message.findByPk(id);
      if (!message) throw new Error('Message not found');
      return await message.update(messageData);
    }
  }

  async getMessageById(id) {
    if (this.useSupabase) {
      return await supabaseService.getMessageById(id);
    } else {
      return await Message.findByPk(id);
    }
  }

  async markMessageAsRead(messageId, userId) {
    if (this.useSupabase) {
      return await supabaseService.markMessageAsRead(messageId, userId);
    } else {
      const message = await Message.findByPk(messageId);
      if (!message) throw new Error('Message not found');
      return await message.markAsRead(userId);
    }
  }

  // Document operations
  async getDocuments(options = {}) {
    if (this.useSupabase) {
      // Convert camelCase column names to snake_case for Supabase
      const supabaseOptions = { ...options };
      if (supabaseOptions.orderBy) {
        const columnMap = {
          'createdAt': 'created_at',
          'updatedAt': 'updated_at',
          'originalFilename': 'original_filename',
          'storedFilename': 'stored_filename',
          'fileSize': 'file_size',
          'pinRequired': 'pin_required',
          'pinHash': 'pin_hash',
          'exchangeId': 'exchange_id',
          'uploadedBy': 'uploaded_by'
        };
        supabaseOptions.orderBy.column = columnMap[supabaseOptions.orderBy.column] || supabaseOptions.orderBy.column;
      }
      return await supabaseService.getDocuments(supabaseOptions);
    } else {
      return await Document.findAll({
        ...options,
        include: [
          { model: User, as: 'uploader' },
          { model: Exchange, as: 'exchange' }
        ]
      });
    }
  }

  async getDocumentById(id) {
    if (this.useSupabase) {
      return await supabaseService.getDocumentById(id);
    } else {
      return await Document.findByPk(id, {
        include: [
          { model: User, as: 'uploadedByUser' },
          { model: Exchange, as: 'exchange' }
        ]
      });
    }
  }

  async createDocument(documentData) {
    if (this.useSupabase) {
      return await supabaseService.createDocument(documentData);
    } else {
      return await Document.create(documentData);
    }
  }

  async updateDocument(id, documentData) {
    if (this.useSupabase) {
      return await supabaseService.updateDocument(id, documentData);
    } else {
      const document = await Document.findByPk(id);
      if (!document) throw new Error('Document not found');
      return await document.update(documentData);
    }
  }

  // Audit log operations
  async getAuditLogs(options = {}) {
    if (this.useSupabase) {
      return await supabaseService.getAuditLogs(options);
    } else {
      return await AuditLog.findAll({
        ...options,
        include: [{ model: User, as: 'user' }],
        order: [['createdAt', 'DESC']]
      });
    }
  }

  async createAuditLog(auditData) {
    if (this.useSupabase) {
      return await supabaseService.createAuditLog(auditData);
    } else {
      return await AuditLog.create(auditData);
    }
  }

  // Notification operations
  async getNotifications(options = {}) {
    if (this.useSupabase) {
      return await supabaseService.getNotifications(options);
    } else {
      return await Notification.findAll({
        ...options,
        include: [{ model: User, as: 'user' }],
        order: [['createdAt', 'DESC']]
      });
    }
  }

  async createNotification(notificationData) {
    if (this.useSupabase) {
      return await supabaseService.createNotification(notificationData);
    } else {
      return await Notification.create(notificationData);
    }
  }

  async updateNotification(id, notificationData) {
    if (this.useSupabase) {
      return await supabaseService.updateNotification(id, notificationData);
    } else {
      const notification = await Notification.findByPk(id);
      if (!notification) throw new Error('Notification not found');
      return await notification.update(notificationData);
    }
  }

  // Dashboard statistics
  async getDashboardStats() {
    if (this.useSupabase) {
      return await supabaseService.getDashboardStats();
    } else {
      const [usersCount, exchangesCount, contactsCount, tasksCount, messagesCount] = await Promise.all([
        User.count(),
        Exchange.count(),
        Contact.count(),
        Task.count(),
        Message.count()
      ]);

      return {
        usersCount,
        exchangesCount,
        contactsCount,
        tasksCount,
        messagesCount
      };
    }
  }

  // Custom queries
  async getExchangesWithParticipants() {
    if (this.useSupabase) {
      return await supabaseService.getExchangesWithParticipants();
    } else {
      return await Exchange.findAll({
        include: [
          { model: User, as: 'coordinator' },
          { model: Contact, as: 'client' }
        ]
      });
    }
  }

  async getMessagesWithSender(exchangeId = null) {
    if (this.useSupabase) {
      return await supabaseService.getMessagesWithSender(exchangeId);
    } else {
      const where = exchangeId ? { exchange_id: exchangeId } : {};
      return await Message.findAll({
        where,
        include: [{ model: User, as: 'sender' }],
        order: [['createdAt', 'DESC']]
      });
    }
  }

  async getExchangeParticipants(options = {}) {
    if (this.useSupabase) {
      return await supabaseService.getExchangeParticipants(options);
    }
    
    // SQLite fallback
    const { where = {}, orderBy = { column: 'created_at', ascending: false } } = options;
    
    const participants = await ExchangeParticipant.findAll({
      where,
      order: [[orderBy.column, orderBy.ascending ? 'ASC' : 'DESC']],
      include: [
        { model: Contact, as: 'contact' },
        { model: User, as: 'user', attributes: { exclude: ['password_hash', 'two_fa_secret'] } }
      ]
    });
    
    return participants;
  }

  async createExchangeParticipant(participantData) {
    if (this.useSupabase) {
      return await supabaseService.createExchangeParticipant(participantData);
    }
    
    // SQLite fallback
    return await ExchangeParticipant.create(participantData);
  }

  async addExchangeParticipant(participantData) {
    if (this.useSupabase) {
      return await supabaseService.createExchangeParticipant(participantData);
    }
    
    // SQLite fallback
    return await ExchangeParticipant.create(participantData);
  }

  async getExchangeParticipant(exchangeId, userId) {
    if (this.useSupabase) {
      return await supabaseService.getExchangeParticipant(exchangeId, userId);
    }
    
    // SQLite fallback
    return await ExchangeParticipant.findOne({
      where: {
        exchange_id: exchangeId,
        user_id: userId
      }
    });
  }

  async deleteExchangeParticipant(participantId) {
    if (this.useSupabase) {
      return await supabaseService.deleteExchangeParticipant(participantId);
    } else {
      const participant = await ExchangeParticipant.findByPk(participantId);
      if (!participant) throw new Error('Exchange participant not found');
      return await participant.destroy();
    }
  }

  // Folder operations
  async getFolders(options = {}) {
    if (this.useSupabase) {
      return await supabaseService.getFolders(options);
    } else {
      const { where = {}, orderBy = { column: 'name', ascending: true } } = options;
      
      let query = {
        where,
        order: [[orderBy.column, orderBy.ascending ? 'ASC' : 'DESC']],
        include: [
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: Exchange, as: 'exchange', attributes: ['id', 'name'] }
        ]
      };

      return await Folder.findAll(query);
    }
  }

  async getFolderById(id) {
    if (this.useSupabase) {
      return await supabaseService.getFolderById(id);
    } else {
      return await Folder.findByPk(id, {
        include: [
          { model: User, as: 'createdBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: Exchange, as: 'exchange', attributes: ['id', 'name'] },
          { model: Folder, as: 'parent' },
          { model: Folder, as: 'children' }
        ]
      });
    }
  }

  async createFolder(folderData) {
    if (this.useSupabase) {
      return await supabaseService.createFolder(folderData);
    } else {
      return await Folder.create(folderData);
    }
  }

  async updateFolder(id, folderData) {
    if (this.useSupabase) {
      return await supabaseService.updateFolder(id, folderData);
    } else {
      const folder = await Folder.findByPk(id);
      if (!folder) throw new Error('Folder not found');
      return await folder.update(folderData);
    }
  }

  async deleteFolder(id) {
    if (this.useSupabase) {
      return await supabaseService.deleteFolder(id);
    } else {
      const folder = await Folder.findByPk(id);
      if (!folder) throw new Error('Folder not found');
      return await folder.destroy();
    }
  }

  async moveDocumentsToFolder(documentIds, folderId) {
    if (this.useSupabase) {
      return await supabaseService.moveDocumentsToFolder(documentIds, folderId);
    } else {
      const documents = await Document.findAll({
        where: { id: documentIds }
      });
      
      const updatedDocuments = await Promise.all(
        documents.map(doc => doc.update({ folder_id: folderId }))
      );
      
      return updatedDocuments;
    }
  }

  // Database connection test
  async testConnection() {
    try {
      if (this.useSupabase) {
        return await supabaseService.testConnection();
      } else {
        await sequelize.authenticate();
        return { status: 'connected', database: 'local' };
      }
    } catch (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  // ===== AUDIT SOCIAL FEATURES =====

  // Get audit log by ID
  async getAuditLogById(id) {
    if (this.useSupabase) {
      return await supabaseService.getAuditLogById(id);
    } else {
      return await AuditLog.findByPk(id, {
        include: [{ model: User, as: 'user' }]
      });
    }
  }

  // Get all interactions for an audit log
  async getAuditInteractions(auditLogId) {
    if (this.useSupabase) {
      return await supabaseService.getAuditInteractions(auditLogId);
    } else {
      // For local database, we'll need to implement this
      // For now, return empty object
      return {
        comments: [],
        likes: [],
        assignments: [],
        escalations: []
      };
    }
  }

  // Comment operations
  async createAuditComment(commentData) {
    if (this.useSupabase) {
      return await supabaseService.createAuditComment(commentData);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit comments not implemented for local database');
    }
  }

  async getAuditCommentById(commentId) {
    if (this.useSupabase) {
      return await supabaseService.getAuditCommentById(commentId);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit comments not implemented for local database');
    }
  }

  async updateAuditComment(commentId, updateData) {
    if (this.useSupabase) {
      return await supabaseService.updateAuditComment(commentId, updateData);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit comments not implemented for local database');
    }
  }

  async deleteAuditComment(commentId) {
    if (this.useSupabase) {
      return await supabaseService.deleteAuditComment(commentId);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit comments not implemented for local database');
    }
  }

  // Like operations
  async createAuditLike(auditLogId, userId, reactionType) {
    if (this.useSupabase) {
      return await supabaseService.createAuditLike(auditLogId, userId, reactionType);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit likes not implemented for local database');
    }
  }

  async getAuditLike(auditLogId, userId) {
    if (this.useSupabase) {
      return await supabaseService.getAuditLike(auditLogId, userId);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit likes not implemented for local database');
    }
  }

  async updateAuditLike(auditLogId, userId, reactionType) {
    if (this.useSupabase) {
      return await supabaseService.updateAuditLike(auditLogId, userId, reactionType);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit likes not implemented for local database');
    }
  }

  async deleteAuditLike(auditLogId, userId) {
    if (this.useSupabase) {
      return await supabaseService.deleteAuditLike(auditLogId, userId);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit likes not implemented for local database');
    }
  }

  // Assignment operations
  async createAuditAssignment(assignmentData) {
    if (this.useSupabase) {
      return await supabaseService.createAuditAssignment(assignmentData);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit assignments not implemented for local database');
    }
  }

  async getAuditAssignmentById(assignmentId) {
    if (this.useSupabase) {
      return await supabaseService.getAuditAssignmentById(assignmentId);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit assignments not implemented for local database');
    }
  }

  async updateAuditAssignment(assignmentId, updateData) {
    if (this.useSupabase) {
      return await supabaseService.updateAuditAssignment(assignmentId, updateData);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit assignments not implemented for local database');
    }
  }

  // Escalation operations
  async createAuditEscalation(escalationData) {
    if (this.useSupabase) {
      return await supabaseService.createAuditEscalation(escalationData);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit escalations not implemented for local database');
    }
  }

  async getAuditEscalationById(escalationId) {
    if (this.useSupabase) {
      return await supabaseService.getAuditEscalationById(escalationId);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit escalations not implemented for local database');
    }
  }

  async updateAuditEscalation(escalationId, updateData) {
    if (this.useSupabase) {
      return await supabaseService.updateAuditEscalation(escalationId, updateData);
    } else {
      // For local database, we'll need to implement this
      throw new Error('Audit escalations not implemented for local database');
    }
  }

  // Task creation from interactions
  async createTaskFromMention(taskData) {
    if (this.useSupabase) {
      return await supabaseService.createTaskFromMention(taskData);
    } else {
      // Create a task for mentioned user
      return await this.createTask({
        title: `Mentioned in audit log comment`,
        description: taskData.commentContent,
        status: 'PENDING',
        priority: 'MEDIUM',
        assignedTo: taskData.mentionedUserId,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        details: {
          type: 'audit_mention',
          auditLogId: taskData.auditLogId,
          mentionedBy: taskData.mentionedBy
        }
      });
    }
  }

  async createTaskFromAssignment(taskData) {
    if (this.useSupabase) {
      return await supabaseService.createTaskFromAssignment(taskData);
    } else {
      // Create a task for assigned user
      return await this.createTask({
        title: `Audit log assignment: ${taskData.assignmentType}`,
        description: taskData.notes || `Review audit log assignment`,
        status: 'PENDING',
        priority: taskData.priority?.toUpperCase() || 'MEDIUM',
        assignedTo: taskData.assignedTo,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days default
        details: {
          type: 'audit_assignment',
          auditLogId: taskData.auditLogId,
          assignmentType: taskData.assignmentType
        }
      });
    }
  }

  async createTaskFromEscalation(taskData) {
    if (this.useSupabase) {
      return await supabaseService.createTaskFromEscalation(taskData);
    } else {
      // Create a high-priority task for escalated user
      return await this.createTask({
        title: `Escalated audit log - Level ${taskData.escalationLevel}`,
        description: taskData.reason,
        status: 'PENDING',
        priority: 'HIGH',
        assignedTo: taskData.escalatedTo,
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        details: {
          type: 'audit_escalation',
          auditLogId: taskData.auditLogId,
          escalationLevel: taskData.escalationLevel,
          priority: taskData.priority
        }
      });
    }
  }

  // User interaction operations
  async getUserAuditInteractions(userId, options = {}) {
    if (this.useSupabase) {
      return await supabaseService.getUserAuditInteractions(userId, options);
    } else {
      // For local database, we'll need to implement this
      throw new Error('User audit interactions not implemented for local database');
    }
  }

  // Statistics
  async getAuditLogStats(auditLogId) {
    if (this.useSupabase) {
      return await supabaseService.getAuditLogStats(auditLogId);
    } else {
      // For local database, we'll need to implement this
      return {
        comments: 0,
        likes: 0,
        assignments: 0,
        escalations: 0
      };
    }
  }

  // Enhanced Notification operations
  async createNotification(notificationData) {
    if (this.useSupabase) {
      return await supabaseService.createNotification(notificationData);
    } else {
      return await Notification.create(notificationData);
    }
  }

  async getNotificationHistory(userId, options = {}) {
    if (this.useSupabase) {
      const { limit = 50, offset = 0, category, status = 'all', startDate, endDate } = options;
      
      let query = supabaseService.client
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      // Get total count
      const { count } = await supabaseService.client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get paginated data
      const { data, error } = await query
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        notifications: data || [],
        total: count || 0
      };
    } else {
      const { limit = 50, offset = 0, category, status = 'all', startDate, endDate } = options;
      
      const where = { user_id: userId };
      
      if (category) where.category = category;
      if (status !== 'all') where.status = status;
      if (startDate) where.created_at = { [Op.gte]: startDate };
      if (endDate) where.created_at = { ...where.created_at, [Op.lte]: endDate };

      const { count, rows } = await Notification.findAndCountAll({
        where,
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      return {
        notifications: rows,
        total: count
      };
    }
  }

  async getUnreadNotificationCount(userId) {
    if (this.useSupabase) {
      const { count, error } = await supabaseService.client
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'unread');

      if (error) throw error;
      return count || 0;
    } else {
      return await Notification.count({
        where: {
          user_id: userId,
          status: 'unread'
        }
      });
    }
  }

  async getNotificationCounts(userId) {
    if (this.useSupabase) {
      const { data, error } = await supabaseService.client
        .rpc('get_notification_counts', { user_uuid: userId });

      if (error) throw error;
      return data?.[0] || { unread_count: 0, total_count: 0, urgent_count: 0 };
    } else {
      const unread = await Notification.count({
        where: { user_id: userId, status: 'unread' }
      });
      const total = await Notification.count({
        where: { user_id: userId }
      });
      const urgent = await Notification.count({
        where: { user_id: userId, status: 'unread', priority: 'urgent' }
      });

      return {
        unread_count: unread,
        total_count: total,
        urgent_count: urgent
      };
    }
  }

  async markNotificationAsRead(notificationId, userId) {
    if (this.useSupabase) {
      const { data, error } = await supabaseService.client
        .rpc('mark_notification_read', { 
          notification_uuid: notificationId, 
          user_uuid: userId 
        });

      if (error) throw error;
      return data;
    } else {
      const result = await Notification.update(
        { 
          status: 'read',
          is_read: true,
          read_at: new Date()
        },
        { 
          where: { 
            id: notificationId, 
            user_id: userId,
            status: 'unread'
          }
        }
      );
      return result[0] > 0;
    }
  }

  async markAllNotificationsAsRead(userId) {
    if (this.useSupabase) {
      const { data, error } = await supabaseService.client
        .from('notifications')
        .update({ 
          status: 'read',
          is_read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'unread')
        .select();

      if (error) throw error;
      return data?.length || 0;
    } else {
      const result = await Notification.update(
        { 
          status: 'read',
          is_read: true,
          read_at: new Date()
        },
        { 
          where: { 
            user_id: userId,
            status: 'unread'
          }
        }
      );
      return result[0];
    }
  }

  async archiveNotification(notificationId, userId) {
    if (this.useSupabase) {
      const { data, error } = await supabaseService.client
        .from('notifications')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      return data?.length > 0;
    } else {
      const result = await Notification.update(
        { 
          status: 'archived',
          archived_at: new Date()
        },
        { 
          where: { 
            id: notificationId, 
            user_id: userId
          }
        }
      );
      return result[0] > 0;
    }
  }

  async deleteNotification(notificationId, userId) {
    if (this.useSupabase) {
      const { data, error } = await supabaseService.client
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId)
        .select();

      if (error) throw error;
      return data?.length > 0;
    } else {
      const result = await Notification.destroy({
        where: { 
          id: notificationId, 
          user_id: userId
        }
      });
      return result > 0;
    }
  }

  async createNotificationActivity(activityData) {
    if (this.useSupabase) {
      const { data, error } = await supabaseService.client
        .from('notification_activity')
        .insert(activityData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // For local database, you'd create a NotificationActivity model
      return activityData; // Simplified for now
    }
  }

  async getNotificationTemplate(templateName) {
    if (this.useSupabase) {
      const { data, error } = await supabaseService.client
        .from('notification_templates')
        .select('*')
        .eq('name', templateName)
        .eq('is_active', true)
        .single();

      if (error) return null;
      return data;
    } else {
      // For local database, you'd create a NotificationTemplate model
      return null; // Simplified for now
    }
  }

  async getUserNotificationPreferences(userId, category) {
    if (this.useSupabase) {
      const { data, error } = await supabaseService.client
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .single();

      if (error) return null;
      return data;
    } else {
      // For local database, you'd create a NotificationPreferences model
      return null; // Simplified for now
    }
  }

  async getAllNotificationPreferences(userId) {
    if (this.useSupabase) {
      const { data, error } = await supabaseService.client
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      return data || [];
    } else {
      // For local database, you'd create a NotificationPreferences model
      return []; // Simplified for now
    }
  }

  async updateNotificationPreferences(userId, category, preferences) {
    if (this.useSupabase) {
      const { data, error } = await supabaseService.client
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          category,
          ...preferences,
          updated_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;
      return data?.length > 0;
    } else {
      // For local database, you'd create a NotificationPreferences model
      return true; // Simplified for now
    }
  }
}

module.exports = new DatabaseService(); 