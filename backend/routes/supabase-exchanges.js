const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { transformToCamelCase, transformApiResponse } = require('../utils/caseTransform');
const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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

    // Build query with joins
    let query = supabase
      .from('exchanges')
      .select(`
        *,
        client:contacts!client_id (
          id,
          first_name,
          last_name,
          email,
          company,
          phone
        ),
        coordinator:users!coordinator_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('is_active', true);

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
    const offset = (parseInt(page) - 1) * parseInt(limit);
    query = query.range(offset, offset + parseInt(limit) - 1);

    // Order by creation date
    query = query.order('created_at', { ascending: false });

    const { data: exchanges, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({
        error: 'Failed to fetch exchanges',
        message: error.message
      });
    }

    // Transform data for frontend
    const transformedExchanges = exchanges.map(exchange => 
      transformApiResponse(exchange, { includeComputed: true })
    );

    // Calculate pagination
    const totalPages = Math.ceil(count / parseInt(limit));

    res.json(transformToCamelCase({
      exchanges: transformedExchanges,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_items: count,
        items_per_page: parseInt(limit),
        has_next: parseInt(page) < totalPages,
        has_previous: parseInt(page) > 1
      }
    }));

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
    const { data: exchange, error } = await supabase
      .from('exchanges')
      .select(`
        *,
        client:contacts!client_id (
          id,
          first_name,
          last_name,
          email,
          company,
          phone,
          address
        ),
        coordinator:users!coordinator_id (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(404).json({
        error: 'Exchange not found',
        message: error.message
      });
    }

    // Get related tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select(`
        *,
        assignedUser:users!assigned_to (
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
        sender:users!sender_id (
          id,
          first_name,
          last_name
        )
      `)
      .eq('exchange_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Transform and enhance data
    const enhancedExchange = {
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

    res.json(transformToCamelCase(enhancedExchange));

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
        coordinator:users!coordinator_id (
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
 * GET /api/exchanges/:id/tasks
 * Get tasks for specific exchange
 */
router.get('/:id/tasks', async (req, res) => {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assignedUser:users!assigned_to (
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