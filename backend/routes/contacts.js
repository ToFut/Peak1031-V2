const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const databaseService = require('../services/database');
const { transformToCamelCase } = require('../utils/caseTransform');
const { Op } = require('sequelize');

const router = express.Router();

// Get all contacts (from Supabase) with pagination
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query; // Default 50 per page
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    console.log(`📥 Getting contacts from database service (page ${page}, limit ${limit})...`);
    
    // Get contacts with pagination
    const contactsResult = await databaseService.getContacts({
      page: parseInt(page),
      limit: parseInt(limit),
      offset,
      search
    });
    
    console.log(`✅ Found ${contactsResult.data?.length || 0} contacts in database (total: ${contactsResult.total || 0})`);
    
    // Transform snake_case to camelCase for frontend
    const transformedContacts = transformToCamelCase(contactsResult.data || []);
    
    // Return in the format frontend expects
    res.json({
      contacts: transformedContacts,
      data: transformedContacts,
      pagination: {
        page: contactsResult.page || parseInt(page),
        limit: contactsResult.limit || parseInt(limit),
        total: contactsResult.total || 0,
        totalPages: contactsResult.totalPages || 1
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