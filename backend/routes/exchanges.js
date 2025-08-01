const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { Exchange, Contact, User, ExchangeParticipant, Task, Document, Message } = require('../models');
const { requireRole, requireResourceAccess } = require('../middleware/auth');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const AuditService = require('../services/audit');
const NotificationService = require('../services/notifications');
const ExchangeWorkflowService = require('../services/exchangeWorkflow');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');
const { Op } = require('sequelize');
const databaseService = require('../services/database');

const router = express.Router();

/**
 * GET /api/exchanges
 * Get exchanges with filtering, searching, and pagination
 */
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
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

    const {
      page = 1,
      limit = 20,
      status,
      priority,
      search,
      coordinator_id,
      client_id,
      sort_by = 'created_at',
      sort_order = 'desc',
      include_inactive = 'false'
    } = req.query;

    // Build where clause based on user role and filters
    const whereClause = await buildExchangeWhereClause(req.user, {
      status,
      priority,
      search,
      coordinator_id,
      client_id,
      include_inactive: include_inactive === 'true'
    });

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

    // Add participant data for admin/staff
    if (['admin', 'staff', 'coordinator'].includes(req.user.role)) {
      includeArray.push({
        model: ExchangeParticipant,
        as: 'exchangeParticipants',
        include: [
          { model: Contact, as: 'contact', attributes: ['id', 'first_name', 'last_name', 'email'] },
          { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'email'] }
        ]
      });
    }

    // Calculate offset for pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Use database service instead of direct Sequelize
    const exchanges = await databaseService.getExchanges({
      where: whereClause,
      limit: parseInt(limit),
      offset: offset,
      orderBy: { column: sort_by, ascending: sort_order === 'asc' }
    });

    // For now, we'll get count separately since our service doesn't support findAndCountAll yet
    const allExchanges = await databaseService.getExchanges({ where: whereClause });
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

    const exchange = await Exchange.findByPk(req.params.id, {
      include: [
        {
          model: Contact,
          as: 'client',
          attributes: ['id', 'first_name', 'last_name', 'email', 'company', 'phone']
        },
        {
          model: User,
          as: 'coordinator',
          attributes: ['id', 'first_name', 'last_name', 'email']
        },
        {
          model: ExchangeParticipant,
          as: 'exchangeParticipants',
          include: [
            { model: Contact, as: 'contact' },
            { model: User, as: 'user', attributes: { exclude: ['password_hash', 'two_fa_secret'] } }
          ]
        },
        {
          model: Task,
          as: 'tasks',
          where: { is_active: true },
          required: false,
          include: [
            { model: User, as: 'assignedUser', attributes: ['id', 'first_name', 'last_name', 'email'] }
          ]
        },
        {
          model: Document,
          as: 'exchangeDocuments',
          where: { is_active: true },
          required: false,
          attributes: ['id', 'filename', 'category', 'created_at', 'file_size', 'pin_required']
        }
      ]
    });

    if (!exchange) {
      return res.status(404).json({
        error: 'Exchange not found'
      });
    }

    // Get recent activity/messages
    const recentMessages = await Message.findAll({
      where: { exchange_id: exchange.id },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'first_name', 'last_name'] }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });

    // Build comprehensive response
    const responseData = {
      ...exchange.toJSON(),
      progress: exchange.calculateProgress(),
      deadlines: exchange.getDaysToDeadline(),
      urgency_level: exchange.getUrgencyLevel(),
      is_overdue: exchange.isOverdue(),
      statistics: {
        total_tasks: exchange.tasks?.length || 0,
        completed_tasks: exchange.tasks?.filter(t => t.status === 'COMPLETED').length || 0,
        pending_tasks: exchange.tasks?.filter(t => t.status === 'PENDING').length || 0,
        total_documents: exchange.exchangeDocuments?.length || 0,
        total_participants: exchange.exchangeParticipants?.length || 0,
        recent_activity_count: recentMessages.length
      },
      recent_messages: recentMessages.map(msg => ({
        id: msg.id,
        content: msg.content.substring(0, 100) + (msg.content.length > 100 ? '...' : ''),
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
 * GET /api/exchanges/:id/participants
 * Get exchange participants
 */
router.get('/:id/participants', [
  param('id').isUUID(),
  requireResourceAccess('exchange')
], async (req, res) => {
  try {
    const participants = await databaseService.getExchangeParticipants({
      where: { exchangeId: req.params.id }
    });

    res.json({
      participants: participants || []
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
  param('id').isUUID(),
  requireResourceAccess('exchange', { permission: 'manage' }),
  body('contact_id').optional().isUUID(),
  body('user_id').optional().isUUID(),
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

    const { contact_id, user_id, role, permissions } = req.body;

    if (!contact_id && !user_id) {
      return res.status(400).json({
        error: 'Either contact_id or user_id must be provided'
      });
    }

    // Check if participant already exists
    const existingParticipant = await ExchangeParticipant.findOne({
      where: {
        exchange_id: req.params.id,
        ...(contact_id ? { contact_id } : { user_id })
      }
    });

    if (existingParticipant) {
      return res.status(409).json({
        error: 'Participant already exists in this exchange'
      });
    }

    // Create participant
    const participant = await ExchangeParticipant.create({
      exchange_id: req.params.id,
      contact_id,
      user_id,
      role,
      permissions
    });

    // Load participant with associations
    const completeParticipant = await ExchangeParticipant.findByPk(participant.id, {
      include: [
        { model: Contact, as: 'contact' },
        { model: User, as: 'user', attributes: { exclude: ['password_hash', 'two_fa_secret'] } }
      ]
    });

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
      participant: completeParticipant
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
 * Remove participant from exchange
 */
router.delete('/:id/participants/:participantId', [
  param('id').isUUID().withMessage('Exchange ID must be a valid UUID'),
  param('participantId').isUUID().withMessage('Participant ID must be a valid UUID'),
  authenticateToken,
  requireResourceAccess('exchange', { permission: 'edit' })
], async (req, res) => {
  try {
    const participant = await ExchangeParticipant.findOne({
      where: {
        id: req.params.participantId,
        exchange_id: req.params.id
      }
    });

    if (!participant) {
      return res.status(404).json({
        error: 'Participant not found'
      });
    }

    await participant.destroy();

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
      where: { exchangeId: req.params.id },
      orderBy: { column: 'dueDate', ascending: true }
    });

    res.json(transformToCamelCase({
      success: true,
      tasks: tasks || []
    }));

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
  authenticateToken,
  requireResourceAccess('exchange', { permission: 'view' })
], async (req, res) => {
  try {
    const documents = await databaseService.getDocuments({
      where: { exchangeId: req.params.id },
      orderBy: { column: 'createdAt', ascending: false }
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
  authenticateToken,
  requireResourceAccess('exchange', { permission: 'view' })
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
    // Clients can only see exchanges they're involved in
    const userContact = await Contact.findOne({ where: { user_id: user.id } });
    if (userContact) {
      whereClause.client_id = userContact.id;
    } else {
      // If no contact record, user sees nothing
      whereClause.id = null;
    }
  } else if (user.role === 'coordinator') {
    // Coordinators see assigned exchanges
    whereClause.coordinator_id = user.id;
  }
  // Admin and staff see all exchanges (filtered by other criteria only)

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

module.exports = router;