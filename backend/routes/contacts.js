const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const Contact = require('../models/Contact');
const { Op } = require('sequelize');

const router = express.Router();

// Get all contacts (read-only from PP)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    
    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { company: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const contacts = await Contact.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: (page - 1) * limit
    });

    res.json({
      data: contacts.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: contacts.count,
        totalPages: Math.ceil(contacts.count / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get contact by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await Contact.findByPk(req.params.id);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    res.json({ data: contact });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search contacts
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const contacts = await Contact.findAll({
      where: {
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${q}%` } },
          { lastName: { [Op.iLike]: `%${q}%` } },
          { email: { [Op.iLike]: `%${q}%` } },
          { company: { [Op.iLike]: `%${q}%` } }
        ]
      },
      limit: parseInt(limit),
      order: [['createdAt', 'DESC']]
    });

    res.json({ data: contacts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router; 