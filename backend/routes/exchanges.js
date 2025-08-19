const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { Exchange, Contact, User, ExchangeParticipant, Task, Document, Message } = require('../models');
const { requireRole, requireResourceAccess } = require('../middleware/auth');
const { authenticateToken } = require('../middleware/auth');
const { enforceRBAC } = require('../middleware/rbac');
const AuditService = require('../services/audit');
const NotificationService = require('../services/notifications');
const ExchangeWorkflowService = require('../services/exchangeWorkflow');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');

// Simple permission check function
const checkPermission = (resource, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log(`🔐 Permission check: ${req.user.role} user accessing ${resource} with ${action} permission`);
    next();
  };
};
const { Op } = require('sequelize');
const databaseService = require('../services/database');

const router = express.Router();

// Test route to verify routing is working
router.get('/test', (req, res) => {
  res.json({ message: 'Exchange routes are working!' });
});

/**
 * GET /api/exchanges/:id/participants
 * Get exchange participants
 */
router.get('/:id/participants', [
  param('id').isUUID(),
  authenticateToken
], async (req, res) => {
  console.log('🎯 PARTICIPANTS ROUTE HIT:', req.params.id);
  try {
    // Use direct Supabase query to get participants with user and contact data
    const supabaseService = require('../services/supabase');
    
    const { data: participants, error } = await supabaseService.client
      .from('exchange_participants')
      .select(`
        *,
        users:user_id(id, email, first_name, last_name),
        contacts:contact_id(id, email, first_name, last_name)
      `)
      .eq('exchange_id', req.params.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching participants:', error);
      return res.status(500).json({
        error: 'Failed to fetch participants',
        message: error.message
      });
    }

    // Transform participants data
    const transformedParticipants = participants.map(p => {
      const user = p.users;
      const contact = p.contacts;
      
      if (user) {
        return {
          id: user.id,
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          email: user.email,
          role: p.role || 'participant',
          participantId: p.id,
          userId: p.user_id,
          contactId: p.contact_id
        };
      } else if (contact) {
        return {
          id: `contact_${contact.id}`,
          firstName: contact.first_name || '',
          lastName: contact.last_name || '',
          email: contact.email,
          role: p.role || 'client',
          participantId: p.id,
          userId: p.user_id,
          contactId: p.contact_id
        };
      } else {
        return {
          id: p.id,
          firstName: 'Unknown',
          lastName: 'User',
          email: 'unknown@example.com',
          role: p.role || 'participant',
          participantId: p.id,
          userId: p.user_id,
          contactId: p.contact_id
        };
      }
    });

    console.log(`📊 Found ${transformedParticipants.length} participants for exchange ${req.params.id}`);

    res.json({
      data: transformedParticipants,
      participants: transformedParticipants // for backward compatibility
    });

  } catch (error) {
    console.error('Error fetching exchange participants:', error);
    res.status(500).json({
      error: 'Failed to fetch participants',
      message: error.message
    });
  }
});

/**
 * POST /api/exchanges/:id/participants
 * Add participant to exchange
 */
router.post('/:id/participants', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('role').isIn(['client', 'coordinator', 'third_party', 'agency']).withMessage('Valid role is required'),
  authenticateToken
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, role } = req.body;
    const exchangeId = req.params.id;

    console.log('🎯 Adding participant to exchange:', { exchangeId, email, role });

    // Check if exchange exists
    const exchange = await databaseService.getExchangeById(exchangeId);
    if (!exchange) {
      return res.status(404).json({
        error: 'Exchange not found'
      });
    }

    // Check if user exists
    const user = await databaseService.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: `No user found with email: ${email}`
      });
    }

    // Check if user is already a participant
    const existingParticipant = await databaseService.getExchangeParticipant(exchangeId, user.id);
    if (existingParticipant) {
      return res.status(409).json({
        error: 'User already a participant',
        message: `${email} is already a participant in this exchange`
      });
    }

    // Add participant to exchange
    const participant = await databaseService.addExchangeParticipant({
      exchange_id: exchangeId,
      user_id: user.id,
      role: role
    });

    console.log('✅ Participant added successfully:', participant);

    // Log the action
    await AuditService.log({
      action: 'PARTICIPANT_ADDED',
      entityType: 'exchange',
      entityId: exchangeId,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        added_user_id: user.id,
        added_user_email: email,
        role: role
      }
    });

    res.status(201).json({
      success: true,
      message: 'Participant added successfully',
      participant: {
        id: participant.id,
        userId: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: role
      }
    });

  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({
      error: 'Failed to add participant',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/documents
 * Get documents for a specific exchange
 */
router.get('/:id/documents', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken
], async (req, res) => {
  try {
    const documents = await databaseService.getDocuments({
      where: { exchange_id: req.params.id },
      orderBy: { column: 'created_at', ascending: false }
    });

    res.json(transformToCamelCase({
      success: true,
      documents: documents || []
    }));

  } catch (error) {
    console.error('Error fetching exchange documents:', error);
    res.status(500).json({
      error: 'Failed to fetch documents',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/audit-logs
 * Get audit logs for a specific exchange
 */
router.get('/:id/audit-logs', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken
], async (req, res) => {
  try {
    const auditLogs = await AuditService.getAuditLogs({
      entityType: 'exchange',
      entityId: req.params.id
    });

    res.json(transformToCamelCase({
      success: true,
      auditLogs: auditLogs || []
    }));

  } catch (error) {
    console.error('Error fetching exchange audit logs:', error);
    res.status(500).json({
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/tasks
 * Get tasks for a specific exchange
 */
router.get('/:id/tasks', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken
], async (req, res) => {
  try {
    const tasks = await databaseService.getTasks({
      where: { exchange_id: req.params.id },
      orderBy: { column: 'due_date', ascending: true }
    });

    // Return tasks array directly to match the /tasks route format
    res.json(transformToCamelCase(tasks || []));

  } catch (error) {
    console.error('Error fetching exchange tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch tasks',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges
 * Get exchanges with filtering, searching, and pagination
 */
router.get('/', [
  authenticateToken,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 5000 }).withMessage('Limit must be between 1 and 5000'),
  query('status').optional().isIn(['PENDING', '45D', '180D', 'COMPLETED', 'TERMINATED', 'ON_HOLD']),
  query('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  query('search').optional().isLength({ min: 1, max: 100 }),
  query('sort_by').optional().isIn(['name', 'status', 'created_at', 'start_date', 'priority']),
  query('sort_order').optional().isIn(['asc', 'desc'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // For admins, default to showing all exchanges unless specifically limited
    const isAdmin = req.user && req.user.role === 'admin';
    const defaultLimit = isAdmin ? 2000 : 20; // Increased to ensure we get all exchanges
    
    const {
      page = 1,
      limit = defaultLimit,
      status,
      priority,
      search,
      coordinator_id,
      client_id,
      sort_by = 'created_at',
      sort_order = 'desc',
      include_inactive = 'false',
      urgent
    } = req.query;

    // Build where clause based on user role and filters
    const whereClause = await buildExchangeWhereClause(req.user, {
      status,
      priority,
      search,
      coordinator_id,
      client_id,
      include_inactive: include_inactive === 'true',
      urgent: urgent === 'true'
    });
    
    console.log('🔍 DEBUG: whereClause =', JSON.stringify(whereClause, null, 2));
    console.log('🔍 DEBUG: user role =', req.user?.role);
    console.log('🔍 DEBUG: user =', { id: req.user?.id, email: req.user?.email, role: req.user?.role });
    console.log('🔍 DEBUG: include_inactive =', include_inactive);
    
    // Log for debugging
    if (req.user && req.user.role === 'admin') {
      console.log(`📊 Admin ${req.user.email} requesting exchanges with limit: ${limit}`);
    }

    // Build include array for associations
    const includeArray = [
      {
        model: Contact,
        as: 'client',
        attributes: ['id', 'first_name', 'last_name', 'email', 'company']
      },
      {
        model: User,
        as: 'coordinator',
        attributes: ['id', 'first_name', 'last_name', 'email'],
        required: false
      }
    ];

    // Add participant data for all users (needed for chat functionality)
    includeArray.push({
      model: ExchangeParticipant,
      as: 'exchangeParticipants',
      include: [
        { model: Contact, as: 'contact', attributes: ['id', 'first_name', 'last_name', 'email'] },
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }
      ]
    });

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Use database service instead of direct Sequelize
    console.log('🔍 DEBUG: Calling databaseService.getExchanges with:', {
      where: whereClause,
      limit: parseInt(limit),
      offset: offset
    });
    
    const exchanges = await databaseService.getExchanges({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      orderBy: { column: sort_by, ascending: sort_order === 'asc' },
      // Include participants for all users (needed for chat functionality)
      includeParticipants: true
    });
    
    console.log('🔍 DEBUG: databaseService returned exchanges:', exchanges?.length || 0);

    // For now, we'll get count separately since our service doesn't support findAndCountAll yet
    const allExchanges = await databaseService.getExchanges({ 
      where: whereClause,
      // Include participants for all users for consistent count
      includeParticipants: true
    });
    
    console.log('🔍 DEBUG: Total count query returned:', allExchanges?.length || 0);
    const count = allExchanges.length;

    // Enhance exchange data with computed fields
    const enhancedExchanges = exchanges.map(exchange => {
      // Handle both Sequelize models and plain objects
      const exchangeData = exchange.toJSON ? exchange.toJSON() : exchange;
      
      // Add computed fields with defaults for Supabase data
      return {
        ...exchangeData,
        progress: exchange.calculateProgress ? exchange.calculateProgress() : 0,
        deadlines: exchange.getDaysToDeadline ? exchange.getDaysToDeadline() : null,
        urgency_level: exchange.getUrgencyLevel ? exchange.getUrgencyLevel() : 'normal',
        is_overdue: exchange.isOverdue ? exchange.isOverdue() : false,
        participant_count: exchangeData.exchangeParticipants?.length || 0
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));

    res.json(transformToCamelCase({
      exchanges: enhancedExchanges,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_items: count,
        items_per_page: parseInt(limit),
        has_next: parseInt(page) < totalPages,
        has_previous: parseInt(page) > 1
      },
      filters_applied: {
        status,
        priority,
        search,
        coordinator_id,
        client_id,
        sort_by,
        sort_order
      }
    }));

  } catch (error) {
    console.error('Error fetching exchanges:', error);
    res.status(500).json({
      error: 'Failed to fetch exchanges',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id
 * Get detailed exchange information
 */
router.get('/:id', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  requireResourceAccess('exchange')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    // Use database service instead of direct Sequelize
    const exchange = await databaseService.getExchangeById(req.params.id);

    if (!exchange) {
      return res.status(404).json({
        error: 'Exchange not found'
      });
    }

    // Get related data using database service
    const tasks = await databaseService.getTasks({ where: { exchange_id: exchange.id } });
    const documents = await databaseService.getDocuments({ where: { exchange_id: exchange.id } });
    const recentMessages = await databaseService.getMessages({ where: { exchange_id: exchange.id }, limit: 10 });

    // Build comprehensive response
    const responseData = {
      ...exchange,
      tasks: tasks,
      documents: documents,
      statistics: {
        total_tasks: tasks.length || 0,
        completed_tasks: tasks.filter(t => t.status === 'COMPLETED').length || 0,
        pending_tasks: tasks.filter(t => t.status === 'PENDING').length || 0,
        total_documents: documents.length || 0,
        total_participants: 0,
        recent_activity_count: recentMessages.length
      },
      recent_messages: recentMessages.map(msg => ({
        id: msg.id,
        content: msg.content?.substring(0, 100) + (msg.content?.length > 100 ? '...' : ''),
        sender: msg.sender,
        created_at: msg.created_at,
        message_type: msg.message_type
      }))
    };

    // Log exchange view
    await AuditService.log({
      action: 'EXCHANGE_VIEWED',
      entityType: 'exchange',
      entityId: exchange.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { exchange_number: exchange.exchange_number }
    });

    res.json(transformToCamelCase(responseData));

  } catch (error) {
    console.error('Error fetching exchange details:', error);
    res.status(500).json({
      error: 'Failed to fetch exchange details',
      message: error.message
    });
  }
});

/**
 * POST /api/exchanges
 * Create a new exchange (manual creation)
 */
router.post('/', [
  requireRole(['admin', 'staff', 'coordinator']),
  body('name').isLength({ min: 1, max: 255 }).withMessage('Exchange name is required and must be less than 255 characters'),
  body('client_id').optional().isUUID().withMessage('Client ID must be a valid UUID'),
  body('coordinator_id').optional().isUUID().withMessage('Coordinator ID must be a valid UUID'),
  body('exchange_type').optional().isIn(['SIMULTANEOUS', 'DELAYED', 'REVERSE', 'IMPROVEMENT']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('start_date').optional().isISO8601().withMessage('Start date must be in ISO 8601 format'),
  body('exchange_value').optional().isDecimal().withMessage('Exchange value must be a decimal number'),
  body('notes').optional().isLength({ max: 2000 }).withMessage('Notes must be less than 2000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const {
      name,
      client_id,
      coordinator_id,
      exchange_type = 'DELAYED',
      priority = 'MEDIUM',
      start_date,
      exchange_value,
      notes,
      relinquished_property,
      replacement_properties = []
    } = req.body;

    // Validate client exists if provided
    if (client_id) {
      const client = await Contact.findByPk(client_id);
      if (!client) {
        return res.status(400).json({
          error: 'Invalid client ID',
          message: 'Specified client does not exist'
        });
      }
    }

    // Validate coordinator exists if provided
    if (coordinator_id) {
      const coordinator = await User.findByPk(coordinator_id);
      if (!coordinator || !['staff', 'coordinator', 'admin'].includes(coordinator.role)) {
        return res.status(400).json({
          error: 'Invalid coordinator ID',
          message: 'Specified coordinator does not exist or has invalid role'
        });
      }
    }

    // Create exchange
    const exchange = await Exchange.create({
      name,
      client_id,
      coordinator_id: coordinator_id || req.user.id, // Default to creating user
      exchange_type,
      priority,
      start_date: start_date ? new Date(start_date) : null,
      exchange_value: exchange_value ? parseFloat(exchange_value) : null,
      notes,
      relinquished_property,
      replacement_properties,
      status: 'Draft'
    });

    // Create initial workflow tasks for new exchange
    try {
      await ExchangeWorkflowService.createStatusTasks(exchange, req.user.id);
    } catch (error) {
      console.error('Error creating initial workflow tasks:', error);
      // Don't fail the exchange creation if task creation fails
    }

    // Add creating user as participant if not already coordinator
    if (exchange.coordinator_id !== req.user.id) {
      await ExchangeParticipant.create({
        exchange_id: exchange.id,
        user_id: req.user.id,
        role: 'creator',
        permissions: { view: true, edit: true, upload: true, message: true, manage: true }
      });
    }

    // Add client as participant if specified
    if (client_id) {
      await ExchangeParticipant.create({
        exchange_id: exchange.id,
        contact_id: client_id,
        role: 'client',
        permissions: { view: true, upload: true, message: true }
      });
    }

    // Load the complete exchange data
    const completeExchange = await Exchange.findByPk(exchange.id, {
      include: [
        { model: Contact, as: 'client' },
        { model: User, as: 'coordinator' }
      ]
    });

    // Send notifications
    if (client_id) {
      await NotificationService.sendExchangeCreatedNotification(completeExchange);
    }

    // Log creation
    await AuditService.log({
      action: 'EXCHANGE_CREATED',
      entityType: 'exchange',
      entityId: exchange.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        exchange_number: exchange.exchange_number,
        name: exchange.name,
        client_id,
        coordinator_id
      }
    });

    res.status(201).json({
      message: 'Exchange created successfully',
      exchange: {
        ...completeExchange.toJSON(),
        progress: completeExchange.calculateProgress(),
        deadlines: completeExchange.getDaysToDeadline(),
        urgency_level: completeExchange.getUrgencyLevel()
      }
    });

  } catch (error) {
    console.error('Error creating exchange:', error);
    res.status(500).json({
      error: 'Failed to create exchange',
      message: error.message
    });
  }
});

/**
 * PUT /api/exchanges/:id
 * Update exchange information
 */
router.put('/:id', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  requireResourceAccess('exchange', { permission: 'edit' }),
  body('name').optional().isLength({ min: 1, max: 255 }),
  body('status').optional().isIn(['PENDING', '45D', '180D', 'COMPLETED', 'TERMINATED', 'ON_HOLD']),
  body('priority').optional().isIn(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  body('coordinator_id').optional().isUUID(),
  body('exchange_value').optional().isDecimal(),
  body('notes').optional().isLength({ max: 2000 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const exchange = await Exchange.findByPk(req.params.id);
    if (!exchange) {
      return res.status(404).json({
        error: 'Exchange not found'
      });
    }

    // Store original values for audit
    const originalValues = { ...exchange.dataValues };

    // Update allowed fields
    const allowedUpdates = [
      'name', 'status', 'priority', 'coordinator_id', 'exchange_value',
      'notes', 'relinquished_property', 'replacement_properties',
      'identification_deadline', 'completion_deadline'
    ];

    const updates = {};
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Validate coordinator if being updated
    if (updates.coordinator_id) {
      const coordinator = await User.findByPk(updates.coordinator_id);
      if (!coordinator || !['staff', 'coordinator', 'admin'].includes(coordinator.role)) {
        return res.status(400).json({
          error: 'Invalid coordinator',
          message: 'Specified coordinator does not exist or has invalid role'
        });
      }
    }

    // Validate status transitions using workflow service
    if (updates.status && updates.status !== exchange.status) {
      try {
        const validation = await ExchangeWorkflowService.validateTransition(
          exchange.id,
          exchange.status,
          updates.status,
          req.user.id
        );
        
        if (!validation.valid) {
          return res.status(400).json({
            error: 'Invalid status transition',
            message: validation.message,
            details: validation.details,
            failed_conditions: validation.failedConditions
          });
        }
      } catch (error) {
        return res.status(400).json({
          error: 'Status transition validation failed',
          message: error.message
        });
      }
    }

    // Update exchange
    await exchange.update(updates);

    // Load updated exchange with associations
    const updatedExchange = await Exchange.findByPk(exchange.id, {
      include: [
        { model: Contact, as: 'client' },
        { model: User, as: 'coordinator' }
      ]
    });

    // Log the update
    await AuditService.log({
      action: 'EXCHANGE_UPDATED',
      entityType: 'exchange',
      entityId: exchange.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        changes: Object.keys(updates),
        original_values: originalValues,
        new_values: updates
      }
    });

    // Send notifications for status changes
    if (updates.status && updates.status !== originalValues.status) {
      await NotificationService.sendStatusChangeNotification(updatedExchange, originalValues.status, updates.status);
    }

    res.json({
      message: 'Exchange updated successfully',
      exchange: {
        ...updatedExchange.toJSON(),
        progress: updatedExchange.calculateProgress(),
        deadlines: updatedExchange.getDaysToDeadline(),
        urgency_level: updatedExchange.getUrgencyLevel()
      }
    });

  } catch (error) {
    console.error('Error updating exchange:', error);
    res.status(500).json({
      error: 'Failed to update exchange',
      message: error.message
    });
  }
});

/**
 * DELETE /api/exchanges/:id
 * Soft delete an exchange (admin only)
 */
router.delete('/:id', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  requireRole(['admin'])
], async (req, res) => {
  try {
    const exchange = await Exchange.findByPk(req.params.id);
    if (!exchange) {
      return res.status(404).json({
        error: 'Exchange not found'
      });
    }

    // Soft delete the exchange
    await exchange.destroy();

    // Log the deletion
    await AuditService.log({
      action: 'EXCHANGE_DELETED',
      entityType: 'exchange',
      entityId: exchange.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        exchange_number: exchange.exchange_number,
        name: exchange.name
      }
    });

    res.json({
      message: 'Exchange deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting exchange:', error);
    res.status(500).json({
      error: 'Failed to delete exchange',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/available-members
 * Get available users and contacts that can be added to exchange (admin/coordinator only)
 */
router.get('/:id/available-members', [
  param('id').isUUID(),
  authenticateToken,
  requireRole(['admin', 'coordinator'])
], async (req, res) => {
  try {
    const { search = '' } = req.query;
    
    // Get current participants to exclude them
    const currentParticipants = await databaseService.getExchangeParticipants({
      where: { exchange_id: req.params.id }
    });
    
    const excludeUserIds = currentParticipants
      .filter(p => p.user_id)
      .map(p => p.user_id);
    
    const excludeContactIds = currentParticipants
      .filter(p => p.contact_id)
      .map(p => p.contact_id);

    // For Supabase, we need to use simpler queries
    let users = [];
    let contacts = [];
    
    try {
      // Get all active users first, then filter in JavaScript
      const allUsers = await databaseService.getUsers({
        where: { is_active: true },
        limit: 100
      });
      
      users = (allUsers || []).filter(u => {
        // Exclude current participants
        if (excludeUserIds.includes(u.id)) return false;
        
        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          const fullName = `${u.first_name} ${u.last_name}`.toLowerCase();
          const email = (u.email || '').toLowerCase();
          return fullName.includes(searchLower) || email.includes(searchLower);
        }
        
        return true;
      }).slice(0, 20);

      // Get all contacts, then filter in JavaScript
      const allContacts = await databaseService.getContacts({
        limit: 100
      });
      
      contacts = (allContacts || []).filter(c => {
        // Exclude current participants
        if (excludeContactIds.includes(c.id)) return false;
        
        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
          const email = (c.email || '').toLowerCase();
          const company = (c.company || '').toLowerCase();
          return fullName.includes(searchLower) || email.includes(searchLower) || company.includes(searchLower);
        }
        
        return true;
      }).slice(0, 20);
    } catch (error) {
      console.error('Error fetching members:', error);
      // Continue with empty arrays
    }

    res.json(transformToCamelCase({
      available_users: users || [],
      available_contacts: contacts || [],
      current_participant_count: currentParticipants.length
    }));

  } catch (error) {
    console.error('Error fetching available members:', error);
    res.status(500).json({
      error: 'Failed to fetch available members',
      message: error.message
    });
  }
});

/**
 * POST /api/exchanges/:id/participants
 * Add participant to exchange (supports existing users and email invitations)
 */
router.post('/:id/participants', [
  param('id').isUUID(),
  requireRole(['admin', 'coordinator']), // Only admin and coordinators can add participants
  body('contact_id').optional().isUUID(),
  body('user_id').optional().isUUID(),
  body('email').optional().isEmail(),
  body('role').isLength({ min: 1, max: 50 }),
  body('permissions').isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { contact_id, user_id, email, role, permissions } = req.body;

    // Validate that at least one identifier is provided
    if (!contact_id && !user_id && !email) {
      return res.status(400).json({
        error: 'Either contact_id, user_id, or email must be provided'
      });
    }

    // If email is provided, try to find existing user or create invitation
    let targetUserId = user_id;
    let targetContactId = contact_id;
    
    if (email && !user_id && !contact_id) {
      // Look for existing user with this email
      const existingUser = await databaseService.getUserByEmail(email);
      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        // Look for existing contact with this email
        const existingContact = await databaseService.getContacts({
          where: { email: email }
        });
        if (existingContact && existingContact.length > 0) {
          targetContactId = existingContact[0].id;
        } else {
          // Create a new contact entry for the email invitation
          const newContact = await databaseService.createContact({
            email: email,
            first_name: email.split('@')[0], // Use email prefix as temporary name
            last_name: 'Invited User',
            company: 'Invited User', // Use company field to mark as invited
            phone: '' // Required field
          });
          targetContactId = newContact.id;
        }
      }
    }

    // Check if participant already exists
    const existingParticipants = await databaseService.getExchangeParticipants({
      where: {
        exchange_id: req.params.id,
        ...(targetContactId ? { contact_id: targetContactId } : { user_id: targetUserId })
      }
    });

    if (existingParticipants && existingParticipants.length > 0) {
      return res.status(409).json({
        error: 'Participant already exists in this exchange'
      });
    }

    // Create participant
    const participant = await databaseService.createExchangeParticipant({
      exchange_id: req.params.id,
      contact_id: targetContactId,
      user_id: targetUserId,
      role,
      permissions
    });

    // For Supabase, we need to load the participant with associations manually
    const completeParticipant = await databaseService.getExchangeParticipants({
      where: { id: participant.id }
    });
    const participantData = completeParticipant && completeParticipant.length > 0 ? completeParticipant[0] : participant;

    // Log the addition
    await AuditService.log({
      action: 'PARTICIPANT_ADDED',
      entityType: 'exchange',
      entityId: req.params.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        participant_id: participant.id,
        contact_id,
        user_id,
        role
      }
    });

    res.status(201).json({
      message: 'Participant added successfully',
      participant: participantData
    });

  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({
      error: 'Failed to add participant',
      message: error.message
    });
  }
});

/**
 * DELETE /api/exchanges/:id/participants/:participantId
 * Remove participant from exchange (admin/coordinator only)
 */
router.delete('/:id/participants/:participantId', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  param('participantId').isUUID().withMessage('Participant ID must be a valid UUID'),
  authenticateToken,
  requireRole(['admin', 'coordinator']) // Only admin and coordinators can remove participants
], async (req, res) => {
  try {
    // Find the participant to remove
    const participants = await databaseService.getExchangeParticipants({
      where: {
        id: req.params.participantId,
        exchange_id: req.params.id
      }
    });

    if (!participants || participants.length === 0) {
      return res.status(404).json({
        error: 'Participant not found'
      });
    }

    const participant = participants[0];

    // Prevent removing the last admin/coordinator from exchange
    if (['admin', 'coordinator'].includes(participant.role)) {
      const adminParticipants = await databaseService.getExchangeParticipants({
        where: {
          exchange_id: req.params.id,
          role: ['admin', 'coordinator']
        }
      });
      
      if (adminParticipants.length <= 1) {
        return res.status(400).json({
          error: 'Cannot remove the last coordinator from this exchange'
        });
      }
    }

    // Remove the participant (using soft delete for Supabase)
    await databaseService.deleteExchangeParticipant(req.params.participantId);

    // Log participant removal
    await AuditService.log({
      action: 'EXCHANGE_PARTICIPANT_REMOVED',
      entityType: 'exchange',
      entityId: req.params.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        participant_id: req.params.participantId,
        participant_email: participant.email,
        participant_role: participant.role
      }
    });

    res.json(transformToCamelCase({
      success: true,
      message: 'Participant removed successfully'
    }));

  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({
      error: 'Failed to remove participant',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/workflow
 * Get exchange workflow summary
 */
router.get('/:id/workflow', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken,
  requireResourceAccess('exchange')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const workflowSummary = await ExchangeWorkflowService.getExchangeWorkflowSummary(req.params.id);
    
    res.json(transformToCamelCase({
      success: true,
      data: workflowSummary
    }));

  } catch (error) {
    console.error('Error fetching exchange workflow:', error);
    res.status(500).json({
      error: 'Failed to fetch exchange workflow',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/transitions
 * Get available status transitions for an exchange
 */
router.get('/:id/transitions', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken,
  requireResourceAccess('exchange')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const exchange = await Exchange.findByPk(req.params.id);
    if (!exchange) {
      return res.status(404).json({
        error: 'Exchange not found'
      });
    }

    const currentStatus = exchange.status || exchange.newStatus;
    const availableTransitions = ExchangeWorkflowService.getAvailableTransitions(currentStatus);
    
    res.json(transformToCamelCase({
      success: true,
      currentStatus,
      availableTransitions
    }));

  } catch (error) {
    console.error('Error fetching available transitions:', error);
    res.status(500).json({
      error: 'Failed to fetch available transitions',
      message: error.message
    });
  }
});

/**
 * POST /api/exchanges/:id/transition
 * Execute status transition for an exchange
 */
router.post('/:id/transition', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken,
  requireResourceAccess('exchange', { permission: 'edit' }),
  body('toStatus').isLength({ min: 1 }).withMessage('Target status is required'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters'),
  body('additionalData').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { toStatus, reason, additionalData } = req.body;
    
    const result = await ExchangeWorkflowService.executeTransition(
      req.params.id,
      toStatus,
      req.user.id,
      reason,
      additionalData
    );

    // Log the successful transition
    await AuditService.log({
      action: 'EXCHANGE_WORKFLOW_TRANSITION',
      entityType: 'exchange',
      entityId: req.params.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        toStatus,
        reason,
        additionalData
      }
    });

    res.json(transformToCamelCase(result));

  } catch (error) {
    console.error('Error executing status transition:', error);
    res.status(500).json({
      error: 'Failed to execute status transition',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/timeline
 * Get exchange status change timeline
 */
router.get('/:id/timeline', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken,
  requireResourceAccess('exchange')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const timeline = await ExchangeWorkflowService.getExchangeTimeline(req.params.id);
    
    res.json(transformToCamelCase({
      success: true,
      timeline
    }));

  } catch (error) {
    console.error('Error fetching exchange timeline:', error);
    res.status(500).json({
      error: 'Failed to fetch exchange timeline',
      message: error.message
    });
  }
});

/**
 * POST /api/exchanges/:id/validate-transition
 * Validate a potential status transition without executing it
 */
router.post('/:id/validate-transition', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken,
  requireResourceAccess('exchange'),
  body('toStatus').isLength({ min: 1 }).withMessage('Target status is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const exchange = await Exchange.findByPk(req.params.id);
    if (!exchange) {
      return res.status(404).json({
        error: 'Exchange not found'
      });
    }

    const fromStatus = exchange.status || exchange.newStatus;
    const { toStatus } = req.body;
    
    const validation = await ExchangeWorkflowService.validateTransition(
      req.params.id,
      fromStatus,
      toStatus,
      req.user.id
    );

    res.json(transformToCamelCase({
      success: true,
      validation
    }));

  } catch (error) {
    console.error('Error validating transition:', error);
    res.status(500).json({
      error: 'Failed to validate transition',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/tasks
 * Get tasks for a specific exchange
 */
router.get('/:id/tasks', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken,
  requireResourceAccess('exchange', { permission: 'view' })
], async (req, res) => {
  try {
    const tasks = await databaseService.getTasks({
      where: { exchange_id: req.params.id },
      orderBy: { column: 'due_date', ascending: true }
    });

    // Return tasks array directly to match the /tasks route format
    res.json(transformToCamelCase(tasks || []));

  } catch (error) {
    console.error('Error fetching exchange tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch tasks',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/documents
 * Get documents for a specific exchange
 */
router.get('/:id/documents', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken
], async (req, res) => {
  try {
    const documents = await databaseService.getDocuments({
      where: { exchange_id: req.params.id },
      orderBy: { column: 'created_at', ascending: false }
    });

    res.json(transformToCamelCase({
      success: true,
      documents: documents || []
    }));

  } catch (error) {
    console.error('Error fetching exchange documents:', error);
    res.status(500).json({
      error: 'Failed to fetch documents',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/audit-logs
 * Get audit logs for a specific exchange
 */
router.get('/:id/audit-logs', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken
], async (req, res) => {
  try {
    const auditLogs = await AuditService.getAuditLogs({
      entityType: 'exchange',
      entityId: req.params.id
    });

    res.json(transformToCamelCase({
      success: true,
      auditLogs: auditLogs || []
    }));

  } catch (error) {
    console.error('Error fetching exchange audit logs:', error);
    res.status(500).json({
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

/**
 * Helper function to build where clause based on user role and filters
 */
async function buildExchangeWhereClause(user, filters) {
  const whereClause = {};

  // Base active filter
  if (!filters.include_inactive) {
    whereClause.is_active = true;
  }

  // Role-based filtering
  if (user.role === 'client') {
    // Use the user's linked contact_id directly
    if (user.contact_id) {
      console.log(`✅ User ${user.email} has linked contact: ${user.contact_id}`);
      
      // Find exchanges where this contact is either the primary client or a participant
      const participants = await databaseService.getExchangeParticipants({
        where: { contact_id: user.contact_id }
      });
        
        const exchangeIds = participants.map(p => p.exchange_id);
        console.log(`📋 Contact is participant in ${exchangeIds.length} exchanges`);
        
        // Include exchanges where they are the primary client OR a participant
        if (exchangeIds.length > 0) {
          whereClause[Op.or] = [
            { client_id: user.contact_id },
            { id: { [Op.in]: exchangeIds } }
          ];
        } else {
          // Only show exchanges where they are the primary client
          whereClause.client_id = user.contact_id;
        }
    } else {
      // FALLBACK: Try to find contact by email (for backward compatibility)
      try {
        const contacts = await databaseService.getContacts({ where: { email: user.email } });
        const contact = contacts && contacts.length > 0 ? contacts[0] : null;
        
        if (contact) {
          console.log(`⚠️ Found contact by email for ${user.email}: ${contact.id} - User should be linked!`);
          
          // Update the user with the contact_id for future requests
          await databaseService.updateUser(user.id, { contact_id: contact.id });
          
          // Continue with the logic
          const participants = await databaseService.getExchangeParticipants({
            where: { contact_id: contact.id }
          });
          
          const exchangeIds = participants.map(p => p.exchange_id);
          
          if (exchangeIds.length > 0) {
            whereClause[Op.or] = [
              { client_id: contact.id },
              { id: { [Op.in]: exchangeIds } }
            ];
          } else {
            whereClause.client_id = contact.id;
          }
        } else {
          // If no contact found, show no exchanges
          whereClause.id = null; // This ensures no exchanges are returned
          console.log(`❌ No contact found for client user: ${user.email}`);
        }
      } catch (error) {
        console.error('Error finding contact for client:', error);
        whereClause.id = null; // Show no exchanges on error
      }
    }
  } else if (user.role === 'coordinator') {
    // Coordinators see exchanges where they are the primary coordinator OR a participant
    console.log(`🔍 Checking exchanges for coordinator: ${user.email} (ID: ${user.id})`);
    
    // Check both user_id and contact_id in participants table
    const participantQueries = [{ user_id: user.id }];
    if (user.contact_id) {
      participantQueries.push({ contact_id: user.contact_id });
    }
    
    const participants = await databaseService.getExchangeParticipants({
      where: { [Op.or]: participantQueries }
    });
    
    const participantExchangeIds = [...new Set(participants.map(p => p.exchange_id))]; // Dedupe
    console.log(`📋 Coordinator is participant in ${participantExchangeIds.length} exchanges`);
    
    if (participantExchangeIds.length > 0) {
      // Show exchanges where they are coordinator OR participant
      whereClause[Op.or] = [
        { coordinator_id: user.id },
        { id: { [Op.in]: participantExchangeIds } }
      ];
      console.log(`✅ Coordinator can see primary + participant exchanges`);
    } else {
      // Only show exchanges where they are the primary coordinator
      whereClause.coordinator_id = user.id;
      console.log(`✅ Coordinator can only see primary exchanges`);
    }
  } else if (user.role === 'third_party' || user.role === 'agency') {
    // Third parties and agencies see exchanges they participate in
    console.log(`🔍 Checking exchanges for ${user.role}: ${user.email} (ID: ${user.id})`);
    
    // Check BOTH user_id and contact_id in participants table (like coordinator logic)
    const participantQueries = [{ user_id: user.id }];
    if (user.contact_id) {
      participantQueries.push({ contact_id: user.contact_id });
    }
    
    const participants = await databaseService.getExchangeParticipants({
      where: { [Op.or]: participantQueries }
    });
    
    const exchangeIds = [...new Set(participants.map(p => p.exchange_id))]; // Dedupe
    console.log(`📋 ${user.role} is participant in ${exchangeIds.length} exchanges`);
    
    if (exchangeIds.length > 0) {
      whereClause.id = { [Op.in]: exchangeIds };
    } else {
      whereClause.id = null; // No exchanges
      console.log(`⚠️ No exchanges found for ${user.role} user: ${user.email}`);
    }
  } else if (user.role === 'admin' || user.role === 'staff') {
    // Admin and staff see all exchanges (no additional filtering based on role)
    console.log(`✅ Admin/Staff user ${user.email} has access to all exchanges`);
  }

  // Apply filters
  if (filters.status) {
    whereClause.status = filters.status;
  }

  if (filters.priority) {
    whereClause.priority = filters.priority;
  }

  if (filters.coordinator_id) {
    whereClause.coordinator_id = filters.coordinator_id;
  }

  if (filters.client_id) {
    whereClause.client_id = filters.client_id;
  }

  // Filter for urgent exchanges (deadlines in next 2 days or overdue)
  if (filters.urgent) {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000));
    
    whereClause[Op.or] = [
      { identification_deadline: { [Op.lte]: twoDaysFromNow } },
      { completion_deadline: { [Op.lte]: twoDaysFromNow } }
    ];
  }

  // Search functionality
  if (filters.search) {
    whereClause[Op.or] = [
      { name: { [Op.iLike]: `%${filters.search}%` } },
      { exchange_number: { [Op.iLike]: `%${filters.search}%` } },
      { notes: { [Op.iLike]: `%${filters.search}%` } }
    ];
  }

  return whereClause;
}

/**
 * GET /api/exchanges/system/overdue-check
 * Check for overdue deadlines across all exchanges (admin only)
 */
router.get('/system/overdue-check', [
  authenticateToken,
  requireRole(['admin', 'staff'])
], async (req, res) => {
  try {
    const overdueResults = await ExchangeWorkflowService.checkOverdueDeadlines();
    
    res.json(transformToCamelCase({
      success: true,
      data: overdueResults,
      message: `Found ${overdueResults.overdueIdentification} overdue identification deadlines and ${overdueResults.overdueExchange} overdue exchange deadlines`
    }));

  } catch (error) {
    console.error('Error checking overdue deadlines:', error);
    res.status(500).json({
      error: 'Failed to check overdue deadlines',
      message: error.message
    });
  }
});

/**
 * POST /api/exchanges/:id/status
 * Update exchange status with workflow validation
 */
router.post('/:id/status', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken,
  requireResourceAccess('exchange', { permission: 'edit' }),
  body('status').isLength({ min: 1 }).withMessage('Status is required'),
  body('reason').optional().isLength({ max: 500 }).withMessage('Reason must be less than 500 characters'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { status, reason, notes } = req.body;
    const exchange = await databaseService.getExchange(req.params.id);

    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }

    const updateData = {
      status,
      updated_by: req.user.id,
      updated_at: new Date()
    };

    if (notes) updateData.notes = notes;

    const updatedExchange = await databaseService.updateExchange(req.params.id, updateData);

    // Log status change
    await AuditService.log({
      action: 'EXCHANGE_STATUS_UPDATED',
      entityType: 'exchange',
      entityId: req.params.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        old_status: exchange.status,
        new_status: status,
        reason,
        notes
      }
    });

    // Emit real-time status update
    const io = req.app.get('io');
    if (io) {
      io.to(`exchange-${req.params.id}`).emit('status-updated', {
        exchangeId: req.params.id,
        status,
        updatedBy: req.user.id,
        updatedAt: new Date()
      });
    }

    res.json(transformToCamelCase({
      success: true,
      exchange: updatedExchange,
      message: 'Exchange status updated successfully'
    }));

  } catch (error) {
    console.error('Error updating exchange status:', error);
    res.status(500).json({
      error: 'Failed to update exchange status',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/activity
 * Get exchange activity feed
 */
router.get('/:id/activity', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken,
  requireResourceAccess('exchange')
], async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const activities = await databaseService.getExchangeActivity(req.params.id, {
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json(transformToCamelCase({
      activities,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: activities.length === parseInt(limit)
      }
    }));

  } catch (error) {
    console.error('Error fetching exchange activity:', error);
    res.status(500).json({
      error: 'Failed to fetch exchange activity',
      message: error.message
    });
  }
});

/**
 * POST /api/exchanges/:id/milestone
 * Add milestone to exchange
 */
router.post('/:id/milestone', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  authenticateToken,
  requireResourceAccess('exchange', { permission: 'edit' }),
  body('title').isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
  body('description').optional().isLength({ max: 1000 }),
  body('due_date').optional().isISO8601(),
  body('milestone_type').optional().isIn(['deadline', 'checkpoint', 'approval', 'document', 'payment'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { title, description, due_date, milestone_type = 'checkpoint' } = req.body;

    const milestoneData = {
      exchange_id: req.params.id,
      title,
      description,
      due_date: due_date ? new Date(due_date) : null,
      milestone_type,
      status: 'pending',
      created_by: req.user.id,
      created_at: new Date()
    };

    const milestone = await databaseService.createExchangeMilestone(milestoneData);

    // Log milestone creation
    await AuditService.log({
      action: 'EXCHANGE_MILESTONE_CREATED',
      entityType: 'exchange',
      entityId: req.params.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        milestone_id: milestone.id,
        title,
        milestone_type
      }
    });

    res.status(201).json(transformToCamelCase({
      success: true,
      milestone,
      message: 'Milestone created successfully'
    }));

  } catch (error) {
    console.error('Error creating exchange milestone:', error);
    res.status(500).json({
      error: 'Failed to create milestone',
      message: error.message
    });
  }
});

/**
 * PUT /api/exchanges/:id/milestone/:milestoneId
 * Update exchange milestone
 */
router.put('/:id/milestone/:milestoneId', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  param('milestoneId').isUUID().withMessage('Milestone ID must be a valid UUID'),
  authenticateToken,
  requireResourceAccess('exchange', { permission: 'edit' }),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  body('completion_notes').optional().isLength({ max: 500 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { status, completion_notes } = req.body;
    const updateData = {};

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'completed') {
        updateData.completed_at = new Date();
        updateData.completed_by = req.user.id;
      }
    }

    if (completion_notes) updateData.completion_notes = completion_notes;

    const milestone = await databaseService.updateExchangeMilestone(req.params.milestoneId, updateData);

    // Log milestone update
    await AuditService.log({
      action: 'EXCHANGE_MILESTONE_UPDATED',
      entityType: 'exchange',
      entityId: req.params.id,
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        milestone_id: req.params.milestoneId,
        status,
        completion_notes
      }
    });

    res.json(transformToCamelCase({
      success: true,
      milestone,
      message: 'Milestone updated successfully'
    }));

  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({
      error: 'Failed to update milestone',
      message: error.message
    });
  }
});

/**
 * DELETE /api/exchanges/:id/participants/:participantId
 * Remove participant from exchange (Admin only)
 */
router.delete('/:id/participants/:participantId', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  param('participantId').isUUID().withMessage('Participant ID must be a valid UUID'),
  authenticateToken,
  requireRole(['admin'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id: exchangeId, participantId } = req.params;
    const adminId = req.user.id;

    console.log(`🗑️ Admin ${req.user.email} attempting to remove participant ${participantId} from exchange ${exchangeId}`);

    // Verify exchange exists
    const exchange = await databaseService.getExchangeById(exchangeId);
    if (!exchange) {
      return res.status(404).json({
        error: 'Exchange not found'
      });
    }

    // Get participant details before removal
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    const { data: participant, error: participantError } = await supabase
      .from('exchange_participants')
      .select(`
        *,
        user:user_id(id, first_name, last_name, email, role),
        contact:contact_id(id, first_name, last_name, email)
      `)
      .eq('id', participantId)
      .eq('exchange_id', exchangeId)
      .single();

    if (participantError || !participant) {
      return res.status(404).json({
        error: 'Participant not found in this exchange'
      });
    }

    const user = participant.user || participant.contact;
    const participantName = user ? `${user.first_name} ${user.last_name}` : 'Unknown User';
    const participantEmail = user?.email || 'Unknown Email';

    // Prevent removing the last admin from an exchange
    if (participant.role === 'admin') {
      const { data: adminParticipants, error: adminCountError } = await supabase
        .from('exchange_participants')
        .select('id')
        .eq('exchange_id', exchangeId)
        .eq('role', 'admin');

      if (!adminCountError && adminParticipants && adminParticipants.length <= 1) {
        return res.status(400).json({
          error: 'Cannot remove the last admin from an exchange'
        });
      }
    }

    // Remove participant from exchange
    const { error: deleteError } = await supabase
      .from('exchange_participants')
      .delete()
      .eq('id', participantId)
      .eq('exchange_id', exchangeId);

    if (deleteError) {
      console.error('❌ Error removing participant:', deleteError);
      return res.status(500).json({
        error: 'Failed to remove participant from exchange'
      });
    }

    // Log the removal action
    await AuditService.log({
      action: 'EXCHANGE_PARTICIPANT_REMOVED',
      entityType: 'exchange',
      entityId: exchangeId,
      userId: adminId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        participant_id: participantId,
        participant_name: participantName,
        participant_email: participantEmail,
        participant_role: participant.role,
        removed_by: adminId
      }
    });

    // Emit socket event for real-time updates
    const io = req.app.get('io');
    if (io) {
      io.to(`exchange_${exchangeId}`).emit('participant_removed', {
        exchangeId,
        participantId,
        participant: {
          id: participantId,
          name: participantName,
          email: participantEmail,
          role: participant.role
        },
        removedBy: req.user.email
      });
    }

    console.log(`✅ Successfully removed participant ${participantName} (${participantEmail}) from exchange ${exchangeId}`);

    res.json({
      success: true,
      message: `Successfully removed ${participantName} from the exchange`,
      participant: {
        id: participantId,
        name: participantName,
        email: participantEmail,
        role: participant.role
      }
    });

  } catch (error) {
    console.error('Error removing participant from exchange:', error);
    res.status(500).json({
      error: 'Failed to remove participant from exchange',
      message: error.message
    });
  }
});

module.exports = router;