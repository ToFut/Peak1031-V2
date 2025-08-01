const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const databaseService = require('../services/database');
const { Op } = require('sequelize');

const router = express.Router();

// Get all messages (admin only)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Only allow admin users to get all messages
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    const { page = 1, limit = 50, search } = req.query;
    
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const messages = await databaseService.getMessages({
      where: whereClause,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      orderBy: { column: 'createdAt', ascending: false }
    });

    res.json({
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.length,
        totalPages: Math.ceil(messages.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get messages for exchange
router.get('/exchange/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, before } = req.query;
    
    const whereClause = { exchangeId: req.params.exchangeId };
    if (before) {
      whereClause.createdAt = { [Op.lt]: new Date(before) };
    }

    const messages = await databaseService.getMessages({
      where: whereClause,
      limit: parseInt(limit),
      offset: (page - 1) * limit,
      orderBy: { column: 'createdAt', ascending: false }
    });

    res.json({
      data: messages.reverse(), // Return in chronological order
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: messages.length,
        totalPages: Math.ceil(messages.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/', authenticateToken, checkPermission('messages', 'write'), async (req, res) => {
  try {
    const { exchangeId, content, attachmentId, messageType = 'text' } = req.body;

    // Verify user has access to this exchange
    const exchange = await databaseService.getExchangeById(exchangeId);
    if (!exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }

    // Check if user has access to this exchange
    if (req.user.role === 'client') {
      if (exchange.clientId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else if (req.user.role === 'coordinator') {
      if (exchange.coordinatorId !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const message = await Message.create({
      content,
      exchangeId,
      senderId: req.user.id,
      attachmentId,
      messageType
    });

    // Populate sender info for response
    await message.reload({
      include: [
        { model: User, as: 'sender' },
        { model: Document, as: 'attachment' }
      ]
    });

    res.status(201).json({ data: message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Mark message as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await message.markAsRead(req.user.id);
    res.json({ message: 'Message marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get unread message count for exchange
router.get('/exchange/:exchangeId/unread', authenticateToken, async (req, res) => {
  try {
    const count = await Message.count({
      where: {
        exchangeId: req.params.exchangeId,
        senderId: { [Op.ne]: req.user.id },
        readBy: { [Op.not]: { [Op.contains]: [req.user.id] } }
      }
    });

    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete message
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete their own messages
    if (message.senderId !== req.user.id) {
      return res.status(403).json({ error: 'Can only delete your own messages' });
    }

    await message.destroy();
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recent messages across all exchanges
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    // Get exchanges user has access to
    let exchangeIds = [];
    if (req.user.role === 'client') {
      const exchanges = await Exchange.findAll({
        where: { clientId: req.user.id },
        attributes: ['id']
      });
      exchangeIds = exchanges.map(e => e.id);
    } else if (req.user.role === 'coordinator') {
      const exchanges = await Exchange.findAll({
        where: { coordinatorId: req.user.id },
        attributes: ['id']
      });
      exchangeIds = exchanges.map(e => e.id);
    }

    if (exchangeIds.length === 0) {
      return res.json({ data: [] });
    }

    const messages = await Message.findAll({
      where: {
        exchangeId: { [Op.in]: exchangeIds }
      },
      include: [
        { model: User, as: 'sender' },
        { model: Exchange, as: 'exchange' }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({ data: messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 