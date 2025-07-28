const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const Exchange = require('../models/Exchange');
const Task = require('../models/Task');
const Document = require('../models/Document');
const Message = require('../models/Message');
const { Op } = require('sequelize');

const router = express.Router();

// Get system statistics
router.get('/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const stats = {
      users: await User.count(),
      exchanges: await Exchange.count(),
      documents: await Document.count(),
      tasks: await Task.count(),
      messages: await Message.count()
    };

    res.json({ data: stats });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all users (admin only)
router.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (role) {
      whereClause.role = role;
    }
    
    if (status) {
      whereClause.isActive = status === 'active';
    }

    const users = await User.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      data: users.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.count,
        totalPages: Math.ceil(users.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new user (admin only)
router.post('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, phone } = req.body;
    
    const user = await User.create({
      email,
      passwordHash: password, // Will be hashed by model hook
      firstName,
      lastName,
      role: role || 'client',
      phone
    });

    res.status(201).json({ data: user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user (admin only)
router.put('/users/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const { email, firstName, lastName, role, phone, isActive } = req.body;
    
    await user.update({
      email,
      firstName,
      lastName,
      role,
      phone,
      isActive
    });

    res.json({ data: user.toJSON() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get audit logs (admin only)
router.get('/audit-logs', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { page = 1, limit = 50, userId, action, startDate, endDate } = req.query;
    
    const whereClause = {};
    if (userId) whereClause.user_id = userId;
    if (action) whereClause.action = action;
    if (startDate || endDate) {
      whereClause.created_at = {};
      if (startDate) whereClause.created_at[Op.gte] = new Date(startDate);
      if (endDate) whereClause.created_at[Op.lte] = new Date(endDate);
    }

    const logs = await AuditLog.findAndCountAll({
      where: whereClause,
      include: [{ model: User, as: 'user' }],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      data: logs.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: logs.count,
        totalPages: Math.ceil(logs.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get system health (admin only)
router.get('/health', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      database: await sequelize.healthCheck()
    };

    res.json({ data: health });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export data (admin only)
router.get('/export/:type', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { type } = req.params;
    const { format = 'json' } = req.query;
    
    let data;
    switch (type) {
      case 'users':
        data = await User.findAll();
        break;
      case 'exchanges':
        data = await Exchange.findAll();
        break;
      case 'documents':
        data = await Document.findAll();
        break;
      default:
        return res.status(400).json({ error: 'Invalid export type' });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csv = convertToCSV(data);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${type}-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.json({ data });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (!data.length) return '';
  
  const headers = Object.keys(data[0].toJSON());
  const csvRows = [headers.join(',')];
  
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

module.exports = router; 