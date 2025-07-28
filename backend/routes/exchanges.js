const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { Exchange, Contact, User, ExchangeParticipant, Task, Document, Message } = require('../models');
const { requireRole, requireResourceAccess } = require('../middleware/auth');
const AuditService = require('../services/audit');
const NotificationService = require('../services/notifications');
const { Op } = require('sequelize');

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

    // Execute query with pagination
    const { count, rows: exchanges } = await Exchange.findAndCountAll({
      where: whereClause,
      include: includeArray,
      limit: parseInt(limit),
      offset: offset,
      order: [[sort_by, sort_order.toUpperCase()]],
      distinct: true // Important for accurate count with includes
    });

    // Enhance exchange data with computed fields
    const enhancedExchanges = exchanges.map(exchange => {
      const exchangeData = exchange.toJSON();
      
      return {
        ...exchangeData,
        progress: exchange.calculateProgress(),
        deadlines: exchange.getDaysToDeadline(),
        urgency_level: exchange.getUrgencyLevel(),
        is_overdue: exchange.isOverdue(),
        participant_count: exchangeData.exchangeParticipants?.length || 0
      };
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
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
    });

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
          as: 'documents',
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
        total_documents: exchange.documents?.length || 0,
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

    res.json(responseData);

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
      status: 'PENDING'
    });

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

    // Validate status transitions
    if (updates.status && updates.status !== exchange.status) {
      const validTransitions = getValidStatusTransitions(exchange.status);
      if (!validTransitions.includes(updates.status)) {
        return res.status(400).json({
          error: 'Invalid status transition',
          message: `Cannot change status from ${exchange.status} to ${updates.status}`,
          valid_transitions: validTransitions
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
    const participants = await ExchangeParticipant.findAll({
      where: { exchange_id: req.params.id },
      include: [
        { model: Contact, as: 'contact' },
        { model: User, as: 'user', attributes: { exclude: ['password_hash', 'two_fa_secret'] } }
      ]
    });

    res.json({
      participants: participants.map(p => ({
        id: p.id,
        role: p.role,
        permissions: p.permissions,
        contact: p.contact,
        user: p.user,
        created_at: p.created_at
      }))
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
 * Get valid status transitions for an exchange
 */
function getValidStatusTransitions(currentStatus) {
  const transitions = {
    'PENDING': ['45D', 'TERMINATED', 'ON_HOLD'],
    '45D': ['180D', 'TERMINATED', 'ON_HOLD'],
    '180D': ['COMPLETED', 'TERMINATED', 'ON_HOLD'],
    'COMPLETED': [], // No transitions from completed
    'TERMINATED': [], // No transitions from terminated
    'ON_HOLD': ['PENDING', '45D', '180D', 'TERMINATED']
  };

  return transitions[currentStatus] || [];
}

module.exports = router;