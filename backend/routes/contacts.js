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
    console.log('👤 CONTACTS ROUTE: Getting contacts for', req.user?.email, 'Role:', req.user?.role);
    
    const { page = 1, limit = 50, search } = req.query;
    const actualLimit = Math.min(parseInt(limit), 1000); // Cap at 1000 for safety
    const offset = (parseInt(page) - 1) * actualLimit;
    
    // Admin sees all contacts
    if (req.user.role === 'admin') {
      console.log('✅ Admin access - fetching all contacts');
      
      // Search in people table
      let peopleQuery = supabase
        .from('people')
        .select('*', { count: 'exact' });
        
      if (search) {
        peopleQuery = peopleQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
      }
      
      const { data: peopleContacts, error: peopleError, count: peopleCount } = await peopleQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + actualLimit - 1);
        
      // Search in contacts table
      let contactsQuery = supabase
        .from('contacts')
        .select('*');
        
      if (search) {
        contactsQuery = contactsQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
      }
      
      const { data: legacyContacts, error: contactsError } = await contactsQuery
        .order('created_at', { ascending: false })
        .limit(actualLimit);
      
      // Merge results
      const allAdminContacts = [...(peopleContacts || [])];
      const adminExistingIds = new Set(peopleContacts?.map(c => c.id) || []);
      
      legacyContacts?.forEach(contact => {
        if (!adminExistingIds.has(contact.id)) {
          allAdminContacts.push(contact);
        }
      });
      
      console.log(`✅ Admin found ${allAdminContacts.length} contacts (${peopleContacts?.length || 0} from people, ${legacyContacts?.length || 0} from contacts)`);
      
      const transformedContacts = transformToCamelCase(allAdminContacts || []);
      
      return res.json({
        contacts: transformedContacts,
        data: transformedContacts,
        pagination: {
          page: parseInt(page),
          limit: actualLimit,
          total: allAdminContacts.length,
          totalPages: Math.ceil(allAdminContacts.length / actualLimit)
        }
      });
    }
    
    // Non-admin users only see contacts related to their exchanges
    console.log('🔐 Applying RBAC filters for non-admin user');
    
    // Get exchanges the user can access
    const userExchanges = await rbacService.getExchangesForUser(req.user, {
      includeParticipant: true
    });
    
    const exchangeIds = userExchanges.data.map(e => e.id);
    
    if (exchangeIds.length === 0) {
      console.log('⚠️ User has no assigned exchanges - returning empty contacts');
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
    
    // Get unique contact IDs - ensure they are strings, not objects
    const contactIds = [...new Set(participants.map(p => {
      const id = p.contact_id;
      return (typeof id === 'string') ? id : (id && id.toString ? id.toString() : null);
    }).filter(id => id))];
    
    // Also include contacts that are clients of the exchanges - ensure they are strings
    const clientIds = userExchanges.data.map(e => {
      const id = e.client_id;
      return (typeof id === 'string') ? id : (id && id.toString ? id.toString() : null);
    }).filter(id => id);
    const allContactIds = [...new Set([...contactIds, ...clientIds])];
    
    if (allContactIds.length === 0) {
      console.log('⚠️ No contacts found for user exchanges');
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
    
    // Query contacts with RBAC filter from people table
    let query = supabase
      .from('people')
      .select('*', { count: 'exact' })
      .in('id', allContactIds);
      
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }
    
    // Apply pagination to people table
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);
      
    const { data: peopleContacts, error, count: peopleCount } = await query;
    
    if (error) {
      console.error('Error fetching contacts from people table:', error);
      throw error;
    }
    
    // Also search in contacts table as fallback
    let contactsQuery = supabase
      .from('contacts')
      .select('*')
      .in('id', allContactIds);
      
    if (search) {
      contactsQuery = contactsQuery.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,company.ilike.%${search}%`);
    }
    
    const { data: legacyContacts, error: contactsError } = await contactsQuery
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (contactsError) {
      console.error('Error fetching contacts from contacts table:', contactsError);
    }
    
    // Merge results, avoiding duplicates based on email or name+company
    const allContacts = [...(peopleContacts || [])];
    const existingIdentifiers = new Set();
    
    peopleContacts?.forEach(contact => {
      if (contact.email) existingIdentifiers.add(contact.email);
      else existingIdentifiers.add(`${contact.first_name}_${contact.last_name}_${contact.company}`);
    });
    
    legacyContacts?.forEach(contact => {
      const identifier = contact.email || `${contact.first_name}_${contact.last_name}_${contact.company}`;
      if (!existingIdentifiers.has(identifier)) {
        allContacts.push(contact);
        existingIdentifiers.add(identifier);
      }
    });
    
    console.log(`✅ Found ${allContacts?.length || 0} total contacts (${peopleContacts?.length || 0} from people, ${legacyContacts?.length || 0} from contacts)`);
    
    const transformedContacts = transformToCamelCase(allContacts || []);
    
    res.json({
      contacts: transformedContacts,
      data: transformedContacts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: allContacts.length,
        totalPages: Math.ceil(allContacts.length / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get contact by ID with full PP data
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    console.log('📧 Getting contact with full PP data:', req.params.id);
    
    // Get contact with all PP fields from Supabase
    const { data: contact, error } = await supabase
      .from('people')
      .select(`
        *,
        pp_id,
        pp_account_ref_id,
        pp_account_ref_display_name,
        pp_is_primary_contact,
        pp_display_name,
        pp_first_name,
        pp_middle_name,
        pp_last_name,
        pp_phone_mobile,
        pp_phone_work,
        pp_email,
        pp_notes,
        pp_custom_field_values,
        pp_company,
        pp_raw_data,
        pp_synced_at,
        pp_created_at,
        pp_updated_at,
        phone_primary,
        phone_mobile,
        phone_work,
        phone_home,
        phone_fax
      `)
      .eq('id', req.params.id)
      .single();
    
    if (error || !contact) {
      console.log('❌ Contact not found in people table, checking contacts table');
      
      // Fallback to contacts table
      const { data: fallbackContact, error: fallbackError } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', req.params.id)
        .single();
        
      if (fallbackError || !fallbackContact) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      
      console.log('✅ Found contact in contacts table with PP data');
      return res.json({ 
        data: transformToCamelCase(fallbackContact),
        ppData: fallbackContact.pp_raw_data || {},
        hasPPData: !!fallbackContact.pp_id
      });
    }

    console.log('✅ Found contact in people table with PP data');
    res.json({ 
      data: transformToCamelCase(contact),
      ppData: contact.pp_raw_data || {},
      hasPPData: !!contact.pp_id
    });
  } catch (error) {
    console.error('❌ Error fetching contact:', error);
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