const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const databaseService = require('../services/database');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');
const { Op } = require('sequelize');

const router = express.Router();

// Get all tasks (role-filtered)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, priority, exchangeId, assignedTo, sortBy = 'due_date', sortOrder = 'ASC' } = req.query;
    
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (priority) {
      whereClause.priority = priority;
    }
    
    if (exchangeId) {
      whereClause.exchange_id = exchangeId;
    }
    
    if (assignedTo) {
      whereClause.assigned_to = assignedTo;
    }

    // Role-based filtering
    if (req.user.role === 'client') {
      // Clients can only see tasks for their exchanges
      const userExchanges = await databaseService.getExchanges({
        where: { clientId: req.user.id }
      });
      whereClause.exchange_id = { [Op.in]: userExchanges.map(e => e.id) };
    } else if (req.user.role === 'coordinator') {
      // Coordinators can see tasks for exchanges they coordinate
      const userExchanges = await databaseService.getExchanges({
        where: { coordinatorId: req.user.id }
      });
      whereClause.exchange_id = { [Op.in]: userExchanges.map(e => e.id) };
    }

    const tasks = await databaseService.getTasks({
      where: whereClause,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      orderBy: { column: sortBy, ascending: sortOrder === 'ASC' }
    });

    // For now, return tasks without pagination since database service doesn't support findAndCountAll
    res.json({
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: tasks.length,
        totalPages: Math.ceil(tasks.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get tasks for specific exchange
router.get('/exchange/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const tasks = await databaseService.getTasks({
      where: { exchangeId: req.params.exchangeId },
      orderBy: { column: 'dueDate', ascending: true }
    });

    res.json(transformToCamelCase({ data: tasks }));
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

    res.json(transformToCamelCase({ data: task }));
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

    res.json(transformToCamelCase({ data: task }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task assignment
router.put('/:id/assign', authenticateToken, checkPermission('tasks', 'write'), async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const task = await databaseService.getTask(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updatedTask = await databaseService.updateTask(req.params.id, { assigned_to: assignedTo });

    res.json(transformToCamelCase({ data: updatedTask }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create custom task
router.post('/', authenticateToken, checkPermission('tasks', 'write'), async (req, res) => {
  try {
    const { title, description, priority, exchangeId, assignedTo, dueDate } = req.body;
    
    const taskData = {
      title,
      description,
      priority: priority || 'MEDIUM',
      exchange_id: exchangeId,
      assigned_to: assignedTo,
      due_date: dueDate,
      status: 'PENDING',
      created_by: req.user.id
    };

    const task = await databaseService.createTask(taskData);

    res.status(201).json({ data: task });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task
router.put('/:id', authenticateToken, checkPermission('tasks', 'write'), async (req, res) => {
  try {
    const { title, description, priority, assignedTo, dueDate, status } = req.body;
    const task = await databaseService.getTask(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (assignedTo !== undefined) updateData.assigned_to = assignedTo;
    if (dueDate !== undefined) updateData.due_date = dueDate;
    if (status !== undefined) {
      updateData.status = status;
      if (status === 'COMPLETED') {
        updateData.completed_at = new Date();
      } else {
        updateData.completed_at = null;
      }
    }

    const updatedTask = await databaseService.updateTask(req.params.id, updateData);

    res.json(transformToCamelCase({ data: updatedTask }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task
router.delete('/:id', authenticateToken, checkPermission('tasks', 'write'), async (req, res) => {
  try {
    const task = await databaseService.getTask(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await databaseService.deleteTask(req.params.id);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get task comments
router.get('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const task = await databaseService.getTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const comments = await databaseService.getTaskComments(req.params.id);
    res.json(transformToCamelCase({ data: comments }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add task comment
router.post('/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const task = await databaseService.getTask(req.params.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const commentData = {
      task_id: req.params.id,
      user_id: req.user.id,
      content,
      created_at: new Date()
    };

    const comment = await databaseService.createTaskComment(commentData);
    res.status(201).json(transformToCamelCase({ data: comment }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 