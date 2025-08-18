const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const databaseService = require('../services/database');
const rbacService = require('../services/rbacService');
const { transformToCamelCase } = require('../utils/caseTransform');
const { Op } = require('sequelize');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Get all contacts (from Supabase) with pagination and RBAC
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, role, status } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log('👤 CONTACTS ROUTE: Getting contacts for', req.user?.email, 'Role:', req.user?.role);
    }

    // Admin users see all contacts
    if (req.user.role === 'admin') {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Admin access - fetching all contacts');
      }
      
      let query = supabase.from('contacts').select('*', { count: 'exact' });
      
      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
      }
      
      if (role) {
        query = query.eq('role', role);
      }
      
      if (status) {
        query = query.eq('status', status);
      }
      
      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);
        
      const { data: contacts, error, count } = await query;
      
      if (error) {
        console.error('Error fetching contacts:', error);
        throw error;
      }
      
      const transformedContacts = transformToCamelCase(contacts || []);
      
      res.json({
        contacts: transformedContacts,
        data: transformedContacts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || 0,
          totalPages: Math.ceil((count || 0) / parseInt(limit))
        }
      });
    } else {
      // Non-admin users only see contacts related to their exchanges
      if (process.env.NODE_ENV === 'development') {
        console.log('🔐 Applying RBAC filters for non-admin user');
      }
      
      // Get exchanges the user can access with timeout handling
      let userExchanges;
      try {
        userExchanges = await rbacService.getExchangesForUser(req.user, {
          includeParticipant: true,
          limit: 500 // Add limit to prevent timeouts
        });
      } catch (rbacError) {
        console.error('❌ RBAC query failed:', rbacError.message);
        // Return empty result instead of failing completely
        return res.json({
          contacts: [],
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0
          },
          warning: 'Contact access temporarily limited'
        });
      }
      
      const exchangeIds = userExchanges.data.map(e => e.id);
      
      if (exchangeIds.length === 0) {
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ User has no assigned exchanges - returning empty contacts');
        }
        return res.json({
          contacts: [],
          data: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: 0,
            totalPages: 0
          }
        });
      }
    
    // Get participants from user's exchanges
    const { data: participants, error: participantError } = await supabase
      .from('exchange_participants')
      .select('contact_id')
      .in('exchange_id', exchangeIds);
      
    if (participantError) {
      console.error('Error fetching participants:', participantError);
      throw participantError;
    }
    
    // Get unique contact IDs
    const contactIds = [...new Set(participants.map(p => p.contact_id).filter(id => id))];
    
    // Also include contacts that are clients of the exchanges
    const clientIds = userExchanges.data.map(e => e.client_id).filter(id => id);
    const allContactIds = [...new Set([...contactIds, ...clientIds])];
    
    if (allContactIds.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ No contacts found for user exchanges');
      }
      return res.json({
        contacts: [],
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      });
    }
    
    // Query contacts with RBAC filter
    let query = supabase
      .from('contacts')
      .select('*', { count: 'exact' })
      .in('id', allContactIds);
      
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }
    
    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
      
    const { data: contacts, error, count } = await query;
    
    if (error) {
      console.error('Error fetching filtered contacts:', error);
      throw error;
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ Found ${contacts?.length || 0} contacts for ${req.user.role} user (total: ${count || 0})`);
    }
    
    const transformedContacts = transformToCamelCase(contacts || []);
    
    res.json({
      contacts: transformedContacts,
      data: transformedContacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / parseInt(limit))
      }
    });
    }
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    
    // Return graceful error response instead of 500
    res.status(200).json({
      contacts: [],
      data: [],
      pagination: {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 20,
        total: 0,
        totalPages: 0
      },
      warning: 'Contact data temporarily unavailable'
    });
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