const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const databaseService = require('../services/database');
const { transformToCamelCase } = require('../utils/caseTransform');
const { Op } = require('sequelize');

const router = express.Router();

// Get all contacts (from Supabase)
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📥 Getting contacts from database service...');
    
    const contacts = await databaseService.getContacts();
    
    console.log(`✅ Found ${contacts.length} contacts in database`);
    
    // Transform snake_case to camelCase for frontend
    const transformedContacts = transformToCamelCase(contacts);
    
    // Return in the format frontend expects
    res.json({
      contacts: transformedContacts,
      data: transformedContacts,
      pagination: {
        page: 1,
        limit: transformedContacts.length,
        total: transformedContacts.length,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get contact by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const contact = await databaseService.getContactById(req.params.id);
    
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