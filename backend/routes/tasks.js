const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const Task = require('../models/Task');
const Exchange = require('../models/Exchange');
const User = require('../models/User');
const { Op } = require('sequelize');

const router = express.Router();

// Get all tasks (role-filtered)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, priority, exchangeId, assignedTo, sortBy = 'dueDate', sortOrder = 'ASC' } = req.query;
    
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (priority) {
      whereClause.priority = priority;
    }
    
    if (exchangeId) {
      whereClause.exchangeId = exchangeId;
    }
    
    if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }

    // Role-based filtering
    if (req.user.role === 'client') {
      // Clients can only see tasks for their exchanges
      const userExchanges = await Exchange.findAll({
        where: { clientId: req.user.id },
        attributes: ['id']
      });
      whereClause.exchangeId = { [Op.in]: userExchanges.map(e => e.id) };
    } else if (req.user.role === 'coordinator') {
      // Coordinators can see tasks for exchanges they coordinate
      const userExchanges = await Exchange.findAll({
        where: { coordinatorId: req.user.id },
        attributes: ['id']
      });
      whereClause.exchangeId = { [Op.in]: userExchanges.map(e => e.id) };
    }

    const tasks = await Task.findAndCountAll({
      where: whereClause,
      include: [
        { model: Exchange, as: 'exchange' },
        { model: User, as: 'assignedToUser' }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      data: tasks.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: tasks.count,
        totalPages: Math.ceil(tasks.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tasks for specific exchange
router.get('/exchange/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const tasks = await Task.findAll({
      where: { exchangeId: req.params.exchangeId },
      include: [
        { model: Exchange, as: 'exchange' },
        { model: User, as: 'assignedToUser' }
      ],
      order: [['dueDate', 'ASC']]
    });

    res.json({ data: tasks });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get task by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const task = await Task.findByPk(req.params.id, {
      include: [
        { model: Exchange, as: 'exchange' },
        { model: User, as: 'assignedToUser' }
      ]
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ data: task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task status
router.put('/:id/status', authenticateToken, checkPermission('tasks', 'write'), async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updateData = { status };
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
    } else {
      updateData.completedAt = null;
    }

    await task.update(updateData);

    res.json({ data: task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task assignment
router.put('/:id/assign', authenticateToken, checkPermission('tasks', 'write'), async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const task = await Task.findByPk(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await task.update({ assignedTo });

    res.json({ data: task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create custom task
router.post('/', authenticateToken, checkPermission('tasks', 'write'), async (req, res) => {
  try {
    const { title, description, priority, exchangeId, assignedTo, dueDate } = req.body;
    
    const task = await Task.create({
      title,
      description,
      priority: priority || 'MEDIUM',
      exchangeId,
      assignedTo,
      dueDate,
      status: 'PENDING'
    });

    res.status(201).json({ data: task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 