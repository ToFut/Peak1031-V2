const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { transformToCamelCase, transformApiResponse } = require('../utils/caseTransform');
const router = express.Router();

// Initialize Supabase client with error handling
let supabase;
try {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Supabase environment variables not found:');
    console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.error('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing');
    throw new Error('Supabase environment variables are required');
  }
  
  supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  console.log('✅ Supabase client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
  // Don't throw here - let the routes handle the error gracefully
}

/**
 * GET /api/exchanges/test
 * Test endpoint to verify Supabase connection (no auth required)
 */
router.get('/test', async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        error: 'Supabase client not initialized',
        message: 'Check environment variables SUPABASE_URL and SUPABASE_SERVICE_KEY'
      });
    }

    const { count, error } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      return res.status(500).json({
        error: 'Database connection failed',
        message: error.message
      });
    }
    
    res.json({
      message: 'Supabase connection successful',
      totalExchanges: count,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Test failed',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges
 * Get exchanges with proper joins and field transformation
 */
router.get('/', async (req, res) => {
  try {
    const { 
      status, 
      coordinator_id, 
      client_id, 
      search, 
      page = 1, 
      limit = 20 
    } = req.query;
    
    // Enforce reasonable limits to prevent performance issues
    const maxLimit = req.user?.role === 'admin' ? 100 : 50;
    const actualLimit = Math.min(parseInt(limit), maxLimit);

    // Check if Supabase client is initialized
    if (!supabase) {
      return res.status(500).json({
        error: 'Database service unavailable',
        message: 'Supabase client not initialized. Check environment variables.'
      });
    }

    // Try Supabase first
    try {
      // Build query with joins to people table
      let query = supabase
        .from('exchanges')
        .select(`
          *,
          client:people!client_id (
            id,
            first_name,
            last_name,
            email,
            company,
            phone
          ),
          coordinator:people!coordinator_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
      ;

      // Role-based filtering
      if (req.user?.role === 'client') {
        // Clients see only their exchanges
        query = query.eq('client_id', req.user.contact_id);
      } else if (req.user?.role === 'coordinator') {
        // Coordinators see assigned exchanges
        query = query.eq('coordinator_id', req.user.id);
      }

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      if (coordinator_id) {
        query = query.eq('coordinator_id', coordinator_id);
      }
      if (client_id) {
        query = query.eq('client_id', client_id);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,notes.ilike.%${search}%`);
      }

      // Add pagination
      const offset = (parseInt(page) - 1) * actualLimit;
      query = query.range(offset, offset + actualLimit - 1);

      // Order by creation date
      query = query.order('created_at', { ascending: false });

      const { data: exchanges, error, count } = await query;

      if (error) {
        console.log('⚠️ Supabase error, falling back to local database:', error.message);
        throw error; // Fall back to local database
      }

      // Transform data for frontend
      const transformedExchanges = exchanges.map(exchange => 
        transformApiResponse(exchange, { includeComputed: true })
      );

      // Normalize replacementProperties to always be an array
      const normalizeReplacementProps = (ex) => {
        let rp = ex.replacementProperties;
        if (typeof rp === 'string') {
          try { rp = JSON.parse(rp); } catch (e) { rp = undefined; }
        }
        if (rp && !Array.isArray(rp)) {
          rp = [rp];
        }
        ex.replacementProperties = Array.isArray(rp) ? rp : [];
        return ex;
      };

      const normalizedExchanges = transformedExchanges.map(normalizeReplacementProps);

      // Calculate pagination
      const totalPages = Math.ceil(count / actualLimit);

      return res.json(transformToCamelCase({
        exchanges: normalizedExchanges,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: count,
          items_per_page: actualLimit,
          has_next: parseInt(page) < totalPages,
          has_previous: parseInt(page) > 1
        }
      }));

    } catch (supabaseError) {
      // Don't fall back to SQLite if Supabase is configured - just return the error
      console.log('❌ Supabase error, returning error instead of fallback:', supabaseError.message);
      return res.status(500).json({
        error: 'Database timeout',
        message: 'Database query timed out. Please try again or reduce the number of results.',
        suggestion: 'Try refreshing the page or use filters to narrow down results.'
      });
    }

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
 * Get single exchange with full details
 */
router.get('/:id', async (req, res) => {
  try {
    // Try Supabase first
    try {
      const { data: exchange, error } = await supabase
        .from('exchanges')
        .select(`
          *,
          client:people!client_id (
            id,
            first_name,
            last_name,
            email,
            company,
            phone,
            address_street
          ),
          coordinator:people!coordinator_id (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', req.params.id)
        .single();

      if (error) {
        console.log('⚠️ Supabase error, falling back to local database:', error.message);
        throw error; // Fall back to local database
      }

      // Get related tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          *,
          assignedUser:people!assigned_to (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('exchange_id', req.params.id)
        .order('due_date', { ascending: true });

      // Get recent messages
      const { data: messages } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          message_type,
          created_at,
          sender:people!sender_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq('exchange_id', req.params.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Transform and enhance data
      const enhancedExchangeRaw = {
        ...transformApiResponse(exchange),
        tasks: tasks ? tasks.map(task => transformApiResponse(task)) : [],
        recentMessages: messages ? messages.map(msg => transformToCamelCase(msg)) : [],
        statistics: {
          totalTasks: tasks?.length || 0,
          completedTasks: tasks?.filter(t => t.status === 'COMPLETED').length || 0,
          pendingTasks: tasks?.filter(t => t.status === 'PENDING').length || 0,
          recentActivityCount: messages?.length || 0
        }
      };

      // Normalize replacementProperties to always be an array
      const normalizeReplacementPropsSingle = (ex) => {
        let rp = ex.replacementProperties;
        if (typeof rp === 'string') {
          try { rp = JSON.parse(rp); } catch (e) { rp = undefined; }
        }
        if (rp && !Array.isArray(rp)) {
          rp = [rp];
        }
        ex.replacementProperties = Array.isArray(rp) ? rp : [];
        return ex;
      };

      const enhancedExchange = normalizeReplacementPropsSingle(enhancedExchangeRaw);

      return res.json(transformToCamelCase(enhancedExchange));

    } catch (supabaseError) {
      // Fall back to local database
      console.log('📋 Using local database fallback for exchange details');
      
      const { Exchange, User, Contact, Task, Message } = require('../models');
      
      const exchange = await Exchange.findByPk(req.params.id, {
        include: [
          { model: Contact, as: 'client' },
          { model: User, as: 'coordinator' }
        ]
      });

      if (!exchange) {
        return res.status(404).json({
          error: 'Exchange not found',
          message: 'Exchange not found in local database'
        });
      }

      // Get related tasks
      const tasks = await Task.findAll({
        where: { exchange_id: req.params.id },
        include: [{ model: User, as: 'assignedUser' }],
        order: [['due_date', 'ASC']]
      });

      // Get recent messages
      const messages = await Message.findAll({
        where: { exchange_id: req.params.id },
        include: [{ model: User, as: 'sender' }],
        order: [['created_at', 'DESC']],
        limit: 10
      });

      // Transform and enhance data
      const enhancedExchange = {
        ...transformApiResponse(exchange.toJSON()),
        tasks: tasks.map(task => transformApiResponse(task.toJSON())),
        recentMessages: messages.map(msg => transformToCamelCase(msg.toJSON())),
        statistics: {
          totalTasks: tasks.length,
          completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
          pendingTasks: tasks.filter(t => t.status === 'PENDING').length,
          recentActivityCount: messages.length
        }
      };

      // Normalize replacementProperties to always be an array
      const normalizeReplacementPropsSingleFallback = (ex) => {
        let rp = ex.replacementProperties;
        if (typeof rp === 'string') {
          try { rp = JSON.parse(rp); } catch (e) { rp = undefined; }
        }
        if (rp && !Array.isArray(rp)) {
          rp = [rp];
        }
        ex.replacementProperties = Array.isArray(rp) ? rp : [];
        return ex;
      };

      const enhancedExchangeFallback = normalizeReplacementPropsSingleFallback(enhancedExchange);

      res.json(transformToCamelCase(enhancedExchangeFallback));
    }

  } catch (error) {
    console.error('Error fetching exchange details:', error);
    res.status(500).json({
      error: 'Failed to fetch exchange details',
      message: error.message
    });
  }
});

/**
 * PUT /api/exchanges/:id/status
 * Update exchange status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'Status is required'
      });
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    if (notes) {
      updateData.notes = notes;
    }

    const { data: updatedExchange, error } = await supabase
      .from('exchanges')
      .update(updateData)
      .eq('id', req.params.id)
      .select(`
        *,
        client:contacts!client_id (
          id,
          first_name,
          last_name,
          email,
          company
        ),
        coordinator:people!coordinator_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Failed to update exchange status',
        message: error.message
      });
    }

    res.json({
      message: 'Exchange status updated successfully',
      exchange: transformApiResponse(updatedExchange)
    });

  } catch (error) {
    console.error('Error updating exchange status:', error);
    res.status(500).json({
      error: 'Failed to update exchange status',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/participants
 * Get exchange participants
 */
router.get('/:id/participants', async (req, res) => {
  try {
    console.log('🎯 PARTICIPANTS ROUTE HIT:', req.params.id);
    
    // First get participants with contact/user relationships
    const { data: participants, error } = await supabase
      .from('exchange_participants')
      .select('*')
      .eq('exchange_id', req.params.id);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Failed to fetch participants',
        message: error.message
      });
    }

    // Now fetch the related contact/user details
    const enrichedParticipants = await Promise.all(participants.map(async (participant) => {
      let name = 'Unknown';
      let email = '';
      let avatar = '';
      
      // Try to get contact details
      if (participant.contact_id) {
        const { data: contact } = await supabase
          .from('people')
          .select('full_name, email, role')
          .eq('id', participant.contact_id)
          .single();
          
        if (contact) {
          name = contact.full_name || 'Unknown';
          // Filter out placeholder emails
          if (contact.email && !contact.email.includes('@imported.com') && 
              !contact.email.includes('@example.com') && 
              !contact.email.includes('@placeholder.com')) {
            email = contact.email;
          }
          avatar = (contact.full_name || 'U').charAt(0).toUpperCase();
        }
      }
      
      // Try to get user details if no contact
      if (!name && participant.user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('first_name, last_name, email')
          .eq('id', participant.user_id)
          .single();
          
        if (user) {
          name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Unknown';
          // Filter out placeholder emails
          if (user.email && !user.email.includes('@imported.com') && 
              !user.email.includes('@example.com') && 
              !user.email.includes('@placeholder.com')) {
            email = user.email;
          }
          avatar = name.charAt(0).toUpperCase();
        }
      }
      
      return {
        ...transformApiResponse(participant),
        name,
        email: email || 'No email available',
        avatar,
        status: participant.is_active ? 'active' : 'inactive',
        permissions: {
          canView: participant.permissions?.includes('view') || false,
          canMessage: participant.permissions?.includes('message') || false,
          canUpload: participant.permissions?.includes('upload') || false,
          canManage: participant.permissions?.includes('manage') || false
        }
      };
    }));

    res.json({
      participants: enrichedParticipants || []
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
 * GET /api/exchanges/:id/documents
 * Get documents for a specific exchange
 */
router.get('/:id/documents', async (req, res) => {
  try {
    console.log('🎯 DOCUMENTS ROUTE HIT:', req.params.id);
    
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .eq('exchange_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Failed to fetch documents',
        message: error.message
      });
    }

    const transformedDocuments = documents.map(doc => 
      transformApiResponse(doc)
    );

    res.json(transformToCamelCase({
      success: true,
      documents: transformedDocuments || []
    }));

  } catch (error) {
    console.error('Error fetching exchange documents:', error);
    res.status(500).json({
      error: 'Failed to fetch documents',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/messages
 * Get messages for a specific exchange
 */
router.get('/:id/messages', async (req, res) => {
  try {
    console.log('🎯 MESSAGES ROUTE HIT:', req.params.id);
    
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('exchange_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Failed to fetch messages',
        message: error.message
      });
    }

    const transformedMessages = messages.map(msg => 
      transformApiResponse(msg)
    );

    res.json(transformToCamelCase({
      success: true,
      messages: transformedMessages || []
    }));

  } catch (error) {
    console.error('Error fetching exchange messages:', error);
    res.status(500).json({
      error: 'Failed to fetch messages',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/audit-logs
 * Get audit logs for a specific exchange
 */
router.get('/:id/audit-logs', async (req, res) => {
  try {
    console.log('🎯 AUDIT-LOGS ROUTE HIT:', req.params.id);
    
    const { data: auditLogs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_id', req.params.id)
      .eq('entity_type', 'exchange')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Failed to fetch audit logs',
        message: error.message
      });
    }

    const transformedAuditLogs = auditLogs.map(log => 
      transformApiResponse(log)
    );

    res.json(transformToCamelCase({
      success: true,
      auditLogs: transformedAuditLogs || []
    }));

  } catch (error) {
    console.error('Error fetching exchange audit logs:', error);
    res.status(500).json({
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

/**
 * GET /api/exchanges/:id/tasks
 * Get tasks for specific exchange
 */
router.get('/:id/tasks', async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignedUser:people!assigned_to (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('exchange_id', req.params.id)
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Failed to fetch tasks',
        message: error.message
      });
    }

    const transformedTasks = tasks.map(task => 
      transformApiResponse(task, { includeComputed: true })
    );

    res.json(transformToCamelCase({
      tasks: transformedTasks
    }));

  } catch (error) {
    console.error('Error fetching exchange tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch tasks',
      message: error.message
    });
  }
});

module.exports = router;