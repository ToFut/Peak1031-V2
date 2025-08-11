const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/rbac');
const supabaseService = require('../services/supabase');
const enhancedTaskService = require('../services/enhancedTaskService');
const { transformToCamelCase, transformToSnakeCase } = require('../utils/caseTransform');

const router = express.Router();

// Get all tasks (role-filtered)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, status, priority, exchangeId, assignedTo, sortBy = 'due_date', sortOrder = 'asc' } = req.query;
    
    let query = supabaseService.client.from('tasks').select(`
      *,
      assignee:assigned_to (
        id,
        first_name,
        last_name,
        email
      ),
      exchange:exchange_id (
        id,
        exchange_number,
        status
      )
    `);

    // Apply filters
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    if (status) {
      query = query.eq('status', status.toUpperCase());
    }
    
    if (priority) {
      query = query.eq('priority', priority.toUpperCase());
    }
    
    if (exchangeId) {
      query = query.eq('exchange_id', exchangeId);
    }
    
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    // Role-based filtering
    if (req.user.role === 'client') {
      // Get client's exchanges first
      const { data: exchanges } = await supabaseService.client
        .from('exchanges')
        .select('id')
        .eq('client_id', req.user.id);
      
      if (exchanges?.length) {
        query = query.in('exchange_id', exchanges.map(e => e.id));
      } else {
        return res.json({ success: true, data: [], total: 0 });
      }
    }

    // Apply sorting and pagination
    query = query
      .order(sortBy, { ascending: sortOrder.toLowerCase() === 'asc' })
      .range((page - 1) * limit, page * limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch tasks',
        details: error.message 
      });
    }

    res.json({
      success: true,
      data: transformToCamelCase(data || []),
      total: count || 0,
      page: parseInt(page),
      totalPages: Math.ceil((count || 0) / limit)
    });

  } catch (error) {
    console.error('Error in GET /tasks:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Get tasks for a specific exchange
router.get('/exchange/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    const { status, priority, assignedTo, limit = '50' } = req.query;
    
    let query = supabaseService.client.from('tasks').select(`
      *,
      assignee:assigned_to (
        id,
        first_name,
        last_name,
        email
      ),
      exchange:exchange_id (
        id,
        exchange_number,
        status
      )
    `);

    // Filter by exchange ID
    query = query.eq('exchange_id', exchangeId);
    
    // Apply additional filters
    if (status) {
      query = query.eq('status', status.toUpperCase());
    }
    
    if (priority) {
      query = query.eq('priority', priority.toUpperCase());
    }
    
    if (assignedTo) {
      query = query.eq('assigned_to', assignedTo);
    }

    // Order by due_date and limit results
    query = query
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching tasks for exchange:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch tasks', 
        details: error.message 
      });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching tasks for exchange:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
      details: error.message 
    });
  }
});

// Get single task
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseService.client
      .from('tasks')
      .select(`
        *,
        assignee:assigned_to (
          id,
          first_name,
          last_name,
          email
        ),
        exchange:exchange_id (
          id,
          exchange_number,
          status
        )
      `)
      .eq('id', req.params.id)
      .single();

    if (error) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }

    res.json({
      success: true,
      data: transformToCamelCase(data)
    });

  } catch (error) {
    console.error('Error in GET /tasks/:id:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Create task
router.post('/', authenticateToken, async (req, res) => {
  try {
    const taskData = transformToSnakeCase({
      ...req.body,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    const { data, error } = await supabaseService.client
      .from('tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) {
      console.error('Error creating task:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create task',
        details: error.message 
      });
    }

    res.status(201).json({
      success: true,
      data: transformToCamelCase(data)
    });

  } catch (error) {
    console.error('Error in POST /tasks:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Update task
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updateData = transformToSnakeCase({
      ...req.body,
      updatedAt: new Date().toISOString()
    });

    const { data, error } = await supabaseService.client
      .from('tasks')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating task:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update task',
        details: error.message 
      });
    }

    res.json({
      success: true,
      data: transformToCamelCase(data)
    });

  } catch (error) {
    console.error('Error in PUT /tasks/:id:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Delete task
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { error } = await supabaseService.client
      .from('tasks')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error('Error deleting task:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to delete task',
        details: error.message 
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('Error in DELETE /tasks/:id:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Enhanced Task Routes
// ===========================

// Parse natural language task (for preview)
router.post('/parse-natural', authenticateToken, async (req, res) => {
  try {
    const { text, exchangeId, ...context } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const result = await enhancedTaskService.parseNaturalLanguageTask(text, {
      ...context,
      exchangeId,
      userId: req.user.id
    });

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error parsing natural language:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to parse natural language',
      details: error.message 
    });
  }
});

// Create task from natural language
router.post('/natural-language', authenticateToken, async (req, res) => {
  try {
    const { text, exchangeId, ...context } = req.body;
    
    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text is required'
      });
    }

    const result = await enhancedTaskService.createTaskFromNaturalLanguage(text, {
      ...context,
      exchangeId,
      userId: req.user.id,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error creating task from natural language:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create task from natural language',
      details: error.message 
    });
  }
});

// Bulk create tasks from natural language
router.post('/bulk-natural', authenticateToken, async (req, res) => {
  try {
    const { tasks, exchangeId, ...context } = req.body;
    
    if (!tasks || !Array.isArray(tasks)) {
      return res.status(400).json({
        success: false,
        error: 'Tasks array is required'
      });
    }

    const results = [];
    for (const taskText of tasks) {
      try {
        const result = await enhancedTaskService.createTaskFromNaturalLanguage(taskText, {
          ...context,
          exchangeId,
          userId: req.user.id,
          createdBy: req.user.id
        });
        results.push(result);
      } catch (error) {
        console.error(`Error creating task from "${taskText}":`, error);
        results.push({ error: error.message, text: taskText });
      }
    }

    res.status(201).json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Error bulk creating tasks:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to bulk create tasks',
      details: error.message 
    });
  }
});

// Extract tasks from chat message
router.post('/from-chat', authenticateToken, async (req, res) => {
  try {
    const { message, exchangeId, senderId, messageId, ...context } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }

    const tasks = await enhancedTaskService.extractTasksFromChatMessage(message, {
      ...context,
      exchangeId,
      senderId,
      messageId,
      userId: req.user.id,
      createdBy: req.user.id
    });

    res.json({
      success: true,
      data: tasks || []
    });

  } catch (error) {
    console.error('Error extracting tasks from chat:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to extract tasks from chat',
      details: error.message 
    });
  }
});

// Get task templates
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const templates = enhancedTaskService.getTaskTemplates();
    
    res.json({
      success: true,
      data: templates
    });

  } catch (error) {
    console.error('Error getting task templates:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get task templates',
      details: error.message 
    });
  }
});

// Get task suggestions
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const { exchangeId, userId } = req.query;
    
    const suggestions = await enhancedTaskService.generateTaskSuggestions({
      exchangeId,
      userId: userId || req.user.id,
      userRole: req.user.role
    });

    res.json({
      success: true,
      data: suggestions || []
    });

  } catch (error) {
    console.error('Error getting task suggestions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get task suggestions',
      details: error.message 
    });
  }
});

// Get auto-complete actions for a task
router.get('/:id/auto-complete', authenticateToken, async (req, res) => {
  try {
    const { data: task } = await supabaseService.client
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const autoActions = await enhancedTaskService.getAutoCompleteActions(task);

    res.json({
      success: true,
      data: {
        task: transformToCamelCase(task),
        autoActions: autoActions || []
      }
    });

  } catch (error) {
    console.error('Error getting auto-complete actions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get auto-complete actions',
      details: error.message 
    });
  }
});

module.exports = router;