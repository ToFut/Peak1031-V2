const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { enforceRBAC } = require('../middleware/rbac');
const { requireExchangePermission } = require('../middleware/permissions');

// Import services with error handling
let supabaseService, enhancedTaskService, rbacService, AuditService;
let transformToCamelCase, transformToSnakeCase;

try {
  supabaseService = require('../services/supabase');
  console.log('✅ Supabase service loaded successfully');
} catch (error) {
  console.error('❌ Failed to load Supabase service:', error.message);
}

try {
  enhancedTaskService = require('../services/enhancedTaskService');
  console.log('✅ Enhanced task service loaded successfully');
} catch (error) {
  console.error('❌ Failed to load enhanced task service:', error.message);
}

try {
  rbacService = require('../services/rbacService');
  console.log('✅ RBAC service loaded successfully');
} catch (error) {
  console.error('❌ Failed to load RBAC service:', error.message);
}

try {
  AuditService = require('../services/audit');
  console.log('✅ Audit service loaded successfully');
} catch (error) {
  console.error('❌ Failed to load audit service:', error.message);
}

try {
  const caseTransform = require('../utils/caseTransform');
  transformToCamelCase = caseTransform.transformToCamelCase;
  transformToSnakeCase = caseTransform.transformToSnakeCase;
  console.log('✅ Case transform utilities loaded successfully');
} catch (error) {
  console.error('❌ Failed to load case transform utilities:', error.message);
  // Fallback functions
  transformToCamelCase = (obj) => obj;
  transformToSnakeCase = (obj) => obj;
}

const router = express.Router();

// Import task rollover service
let taskRolloverService;
try {
  taskRolloverService = require('../services/taskRolloverService');
  console.log('✅ Task rollover service loaded successfully');
} catch (error) {
  console.error('❌ Failed to load task rollover service:', error.message);
}

// Test endpoint to verify database connection
router.get('/test', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 Testing database connection...');
    
    // Test basic query
    const { data, error } = await supabaseService.client
      .from('tasks')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Database test failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Database connection failed',
        details: error.message
      });
    }
    
    console.log('✅ Database connection successful');
    res.json({
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test endpoint error:', error);
    res.status(500).json({
      success: false,
      error: 'Test failed',
      details: error.message
    });
  }
});

// Test task creation endpoint
router.post('/test-create', authenticateToken, async (req, res) => {
  try {
    console.log('🧪 Testing task creation...');
    console.log('📋 Test data:', req.body);
    
    // Simple test task
    const testTask = {
      title: 'Test Task',
      description: 'This is a test task',
      status: 'PENDING',
      priority: 'MEDIUM',
      exchange_id: req.body.exchange_id || '00000000-0000-0000-0000-000000000000',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📋 Test task data:', testTask);
    
    const { data, error } = await supabaseService.client
      .from('tasks')
      .insert([testTask])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Test task creation failed:', error);
      return res.status(500).json({
        success: false,
        error: 'Test task creation failed',
        details: error.message
      });
    }
    
    console.log('✅ Test task created successfully:', data.id);
    
    // Clean up - delete the test task
    await supabaseService.client
      .from('tasks')
      .delete()
      .eq('id', data.id);
    
    res.json({
      success: true,
      message: 'Test task creation successful',
      taskId: data.id,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test task creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Test task creation failed',
      details: error.message
    });
  }
});

// Simple GET endpoint that avoids complex queries
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📋 TASKS ROUTE: Getting tasks for', req.user?.email, 'Role:', req.user?.role);
    
    const { page = 1, limit = 50 } = req.query;
    
    // Use a simple query with minimal filters to avoid URL length issues
    const { data: tasks, error, count } = await supabaseService.client
      .from('tasks')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (error) {
      console.error('Error fetching tasks:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch tasks',
        details: error.message 
      });
    }

    console.log(`📋 Found ${tasks?.length || 0} tasks for ${req.user?.email}`);

    // Now get related data for the tasks we fetched (to avoid complex joins in the main query)
    let enrichedTasks = tasks || [];
    if (enrichedTasks.length > 0) {
      try {
        // Get unique assignee IDs
        const assigneeIds = [...new Set(enrichedTasks.map(t => t.assigned_to).filter(id => id))];
        // Get unique exchange IDs
        const exchangeIds = [...new Set(enrichedTasks.map(t => t.exchange_id).filter(id => id))];
        
        // Fetch assignee data
        let assignees = [];
        if (assigneeIds.length > 0) {
          const { data: assigneeData } = await supabaseService.client
            .from('users')
            .select('id, first_name, last_name, email')
            .in('id', assigneeIds);
          assignees = assigneeData || [];
        }
        
        // Fetch exchange data
        let exchanges = [];
        if (exchangeIds.length > 0) {
          const { data: exchangeData } = await supabaseService.client
            .from('exchanges')
            .select('id, exchange_number, status')
            .in('id', exchangeIds);
          exchanges = exchangeData || [];
        }
        
        // Enrich tasks with related data
        enrichedTasks = enrichedTasks.map(task => ({
          ...task,
          assignee: assignees.find(a => a.id === task.assigned_to) || null,
          exchange: exchanges.find(e => e.id === task.exchange_id) || null
        }));
        
      } catch (enrichError) {
        console.error('Error enriching task data:', enrichError);
        // Continue with basic tasks if enrichment fails
      }
    }

    res.json({
      success: true,
      tasks: transformToCamelCase(enrichedTasks),
      total: count || 0,
      page: parseInt(page),
      limit: parseInt(limit),
      hasMore: (count || 0) > page * limit
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
router.get('/exchange/:exchangeId', authenticateToken, requireExchangePermission('view_tasks'), async (req, res) => {
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

    // Return consistent format with the main tasks endpoint
    res.json({
      success: true,
      tasks: transformToCamelCase(data || []),
      total: data?.length || 0,
      exchangeId: exchangeId
    });
  } catch (error) {
    console.error('Error fetching tasks for exchange:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error', 
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
router.post('/', authenticateToken, requireExchangePermission('create_tasks'), async (req, res) => {
  try {
    console.log('📋 TASK CREATION: Creating task for user', req.user?.email);
    console.log('📋 TASK DATA:', JSON.stringify(req.body, null, 2));
    console.log('📋 USER INFO:', { 
      id: req.user?.id, 
      email: req.user?.email, 
      role: req.user?.role,
      hasUser: !!req.user,
      userId: req.user?.id || 'NO USER ID'
    });

    // Enhanced validation with detailed logging
    const validationErrors = [];

    // Check if user exists and has ID
    if (!req.user || !req.user.id) {
      validationErrors.push('User authentication failed - no user ID found');
      console.log('❌ VALIDATION: User ID missing:', {
        hasUser: !!req.user,
        userId: req.user?.id,
        userEmail: req.user?.email
      });
    }

    if (!req.body.title || typeof req.body.title !== 'string' || req.body.title.trim() === '') {
      validationErrors.push('Task title is required and must be a non-empty string');
    }

    const exchangeId = req.body.exchange_id || req.body.exchangeId;
    if (!exchangeId || typeof exchangeId !== 'string' || exchangeId.trim() === '') {
      validationErrors.push('Exchange ID is required and must be a non-empty string');
      console.log('❌ VALIDATION: Exchange ID missing or invalid:', { 
        exchange_id: req.body.exchange_id, 
        exchangeId: req.body.exchangeId,
        type_exchange_id: typeof req.body.exchange_id,
        type_exchangeId: typeof req.body.exchangeId
      });
    }

    if (validationErrors.length > 0) {
      console.log('❌ VALIDATION ERRORS:', validationErrors);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors,
        receivedData: {
          title: req.body.title,
          exchange_id: req.body.exchange_id,
          exchangeId: req.body.exchangeId,
          hasTitle: !!req.body.title,
          hasExchangeId: !!(req.body.exchange_id || req.body.exchangeId)
        }
      });
    }

    // Prepare task data using validated exchangeId
    const taskData = {
      title: req.body.title.trim(),
      description: req.body.description || '',
      status: (req.body.status || 'PENDING').toUpperCase(),
      priority: (req.body.priority || 'MEDIUM').toUpperCase(),
      exchange_id: exchangeId, // Use the validated exchangeId
      assigned_to: req.body.assigned_to || req.body.assignedTo || null,
      due_date: req.body.due_date || req.body.dueDate || null,
      pp_data: req.body.pp_data || req.body.ppData || {},
      // metadata: req.body.metadata || {}, // Temporarily removed - column doesn't exist in database
      created_by: req.user.id, // Add who created the task
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📋 PROCESSED TASK DATA:', JSON.stringify(taskData, null, 2));

    // Verify exchange exists before creating task
    try {
      const { data: exchange, error: exchangeError } = await supabaseService.client
        .from('exchanges')
        .select('id, exchange_number, status')
        .eq('id', exchangeId)
        .single();

      if (exchangeError || !exchange) {
        console.log('❌ Exchange not found:', exchangeId, exchangeError);
        return res.status(400).json({
          success: false,
          error: 'Invalid exchange ID - exchange not found',
          exchangeId: exchangeId,
          details: exchangeError?.message
        });
      }

      console.log('✅ Exchange verified:', exchange.exchange_number);
    } catch (exchangeCheckError) {
      console.error('❌ Error checking exchange:', exchangeCheckError);
      return res.status(500).json({
        success: false,
        error: 'Failed to verify exchange',
        details: exchangeCheckError.message
      });
    }

    // Validate assignment if assigned_to is provided and not empty
    if (taskData.assigned_to && taskData.assigned_to.trim() !== '') {
      console.log('🔍 Validating assignment:', taskData.assigned_to);
      
      try {
        // First check if the assignee exists in the people table (which tasks.assigned_to references)
        const { data: assigneePerson, error: assigneeError } = await supabaseService.client
          .from('people')
          .select('id, first_name, last_name, email')
          .eq('id', taskData.assigned_to)
          .single();

        if (assigneeError || !assigneePerson) {
          console.log('❌ Assignee not found in people table, checking users table...');
          
          // If not found in people table, check users table and potentially create a people record
          const { data: assigneeUser, error: userError } = await supabaseService.client
            .from('users')
            .select('id, first_name, last_name, email')
            .eq('id', taskData.assigned_to)
            .single();

          if (userError || !assigneeUser) {
            console.log('❌ Assignee not found in users table either, creating unassigned task');
            taskData.assigned_to = null;
          } else {
            console.log('✅ Found assignee in users table, checking if they need a people record...');
            
            // Create a people record for this user if it doesn't exist
            const { data: newPerson, error: createError } = await supabaseService.client
              .from('people')
              .upsert({
                id: assigneeUser.id,
                first_name: assigneeUser.first_name,
                last_name: assigneeUser.last_name,
                email: assigneeUser.email,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              })
              .select()
              .single();

            if (createError) {
              console.error('❌ Failed to create people record:', createError);
              taskData.assigned_to = null;
            } else {
              console.log('✅ Created/updated people record for assignment');
            }
          }
        } else {
          console.log('✅ Assignee found in people table');
        }

        console.log('✅ Assignment validation completed');
      } catch (assignmentValidationError) {
        console.error('❌ Error validating assignment:', assignmentValidationError);
        // Don't fail the entire request, just create an unassigned task
        taskData.assigned_to = null;
        console.log('📋 Creating unassigned task due to assignment validation error');
      }
    }

    // Insert task into database
    const { data, error } = await supabaseService.client
      .from('tasks')
      .insert([taskData])
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
      .single();

    if (error) {
      console.error('❌ Error creating task:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to create task',
        details: error.message 
      });
    }

    console.log('✅ Task created successfully:', data.id);

    // Log audit trail (simplified to avoid errors)
    try {
      if (AuditService && AuditService.log) {
        await AuditService.log({
          action: 'TASK_CREATED',
          userId: req.user.id,
          entityType: 'task',
          entityId: data.id,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          details: {
            taskTitle: data.title,
            exchangeId: data.exchange_id,
            assignedTo: data.assigned_to,
            priority: data.priority
          }
        });
      }
    } catch (auditError) {
      console.error('⚠️ Audit logging failed:', auditError);
    }

    // Enhanced real-time notifications for task creation
    const taskExchangeId = data.exchange_id;
    const io = req.app.get('io');
    if (io && taskExchangeId) {
      console.log(`📡 Emitting enhanced task_created notifications for exchange_${taskExchangeId}`);
      
      const taskEvent = {
        exchangeId: taskExchangeId,
        taskId: data.id,
        task: data,
        createdBy: req.user.id,
        timestamp: new Date().toISOString()
      };

      // Check if this task should notify all users (metadata column doesn't exist yet)
      const shouldNotifyAllUsers = false; // req.body.metadata?.notify_all_users || false;

      // 1. Emit to exchange room (for exchange-specific task lists)
      io.to(`exchange_${taskExchangeId}`).emit('task_created', taskEvent);
      console.log(`📡 Emitted to exchange room: exchange_${taskExchangeId}`);

      // 2. Emit to creator's dashboard (so they see it in their dashboard)
      io.to(`user_${req.user.id}`).emit('task_created', taskEvent);
      console.log(`📡 Emitted to creator dashboard: user_${req.user.id}`);

      // 3. Emit to assignee's dashboard (if task is assigned)
      if (data.assigned_to && data.assigned_to !== req.user.id) {
        io.to(`user_${data.assigned_to}`).emit('task_created', taskEvent);
        io.to(`user_${data.assigned_to}`).emit('task_assigned', taskEvent);
        console.log(`📡 Emitted to assignee dashboard: user_${data.assigned_to}`);
      }

      // 4. Handle "ALL" users notification
      if (shouldNotifyAllUsers) {
        try {
          // Get all active users in the system
          const { data: allUsers, error: usersError } = await supabaseService.client
            .from('users')
            .select('id, email')
            .eq('is_active', true);

          if (!usersError && allUsers) {
            allUsers.forEach(user => {
              if (user.id !== req.user.id) {
                io.to(`user_${user.id}`).emit('task_created', taskEvent);
                io.to(`user_${user.id}`).emit('task_assigned', taskEvent);
                console.log(`📡 Emitted to all users: user_${user.id}`);
              }
            });
            console.log(`📡 Notified all ${allUsers.length} users about the task`);
          }
        } catch (allUsersError) {
          console.error('⚠️ Failed to notify all users:', allUsersError);
        }
      } else {
        // 5. Emit to exchange participants only (if not notifying all users)
        try {
          const databaseService = require('../services/database');
          const participants = await databaseService.getExchangeParticipants({
            where: { exchange_id: taskExchangeId }
          });
          
          participants.forEach(participant => {
            if (participant.user_id && participant.user_id !== req.user.id) {
              io.to(`user_${participant.user_id}`).emit('task_created', taskEvent);
              console.log(`📡 Emitted to participant dashboard: user_${participant.user_id}`);
            }
          });

          console.log(`📡 Total real-time notifications sent: ${1 + (data.assigned_to ? 2 : 0) + participants.length}`);
        } catch (participantError) {
          console.error('⚠️ Failed to get exchange participants for real-time notifications:', participantError);
        }
      }
    } else {
      console.warn('⚠️ Socket.IO not available for real-time task creation notification');
    }

    res.status(201).json({
      success: true,
      data: transformToCamelCase(data)
    });

  } catch (error) {
    console.error('❌ Error in POST /tasks:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Update task
router.put('/:id', authenticateToken, requireExchangePermission('edit_tasks'), async (req, res) => {
  // Check task permissions before updating
  try {
    const { data: task, error } = await supabaseService.client
      .from('tasks')
      .select('exchange_id, assigned_to, created_by')
      .eq('id', req.params.id)
      .single();

    if (error || !task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Check if user has edit permissions for this exchange
    const permissionService = require('../services/permissionService');
    const hasEditPermission = await permissionService.checkPermission(req.user.id, task.exchange_id, 'edit_tasks');
    
    // Allow if user has edit permission, is assigned to the task, or created the task
    if (!hasEditPermission && task.assigned_to !== req.user.id && task.created_by !== req.user.id) {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to edit this task' 
      });
    }
  } catch (permissionError) {
    console.error('Error checking task permissions:', permissionError);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to check permissions' 
    });
  }
  try {
    console.log('📋 TASK UPDATE: Updating task', req.params.id, 'for user', req.user?.email);
    console.log('📋 UPDATE DATA:', req.body);

    // Prepare update data
    const updateData = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    // Handle status changes
    if (req.body.status === 'COMPLETED' && !req.body.completed_at) {
      updateData.completed_at = new Date().toISOString();
    } else if (req.body.status !== 'COMPLETED') {
      updateData.completed_at = null;
    }

    console.log('📋 PROCESSED UPDATE DATA:', updateData);

    const { data, error } = await supabaseService.client
      .from('tasks')
      .update(updateData)
      .eq('id', req.params.id)
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
      .single();

    if (error) {
      console.error('❌ Error updating task:', error);
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to update task',
        details: error.message 
      });
    }

    console.log('✅ Task updated successfully:', data.id);

    // Log audit trail
    try {
      await AuditService.log({
        action: 'TASK_UPDATED',
        userId: req.user.id,
        entityType: 'task',
        entityId: data.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        details: {
          taskTitle: data.title,
          exchangeId: data.exchange_id,
          oldStatus: req.body.oldStatus,
          newStatus: data.status,
          changes: req.body
        }
      });
    } catch (auditError) {
      console.error('⚠️ Audit logging failed:', auditError);
    }

    // Emit real-time event for task update
    const exchangeId = data.exchange_id;
    const io = req.app.get('io');
    if (io && exchangeId) {
      console.log(`📡 Emitting task_updated to exchange_${exchangeId}`);
      io.to(`exchange_${exchangeId}`).emit('task_updated', {
        exchangeId: exchangeId,
        taskId: data.id,
        task: data,
        updatedBy: req.user.id
      });
      
      // Also emit to all connected users in the exchange (fallback)
      try {
        const databaseService = require('../services/database');
        const participants = await databaseService.getExchangeParticipants({
          where: { exchange_id: exchangeId }
        });
        
        participants.forEach(participant => {
          if (participant.user_id) {
            io.to(`user_${participant.user_id}`).emit('task_updated', {
              exchangeId: exchangeId,
              taskId: data.id,
              task: data,
              updatedBy: req.user.id
            });
          }
        });
      } catch (participantError) {
        console.error('⚠️ Failed to get exchange participants:', participantError);
      }
    } else {
      console.warn('⚠️ Socket.IO not available for real-time task update notification');
    }

    res.json({
      success: true,
      data: transformToCamelCase(data)
    });

  } catch (error) {
    console.error('❌ Error in PUT /tasks/:id:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// Delete task
router.delete('/:id', authenticateToken, requireExchangePermission('delete_tasks'), async (req, res) => {
  // Check task permissions before deleting
  try {
    const { data: task, error } = await supabaseService.client
      .from('tasks')
      .select('exchange_id, assigned_to, created_by')
      .eq('id', req.params.id)
      .single();

    if (error || !task) {
      return res.status(404).json({ success: false, error: 'Task not found' });
    }

    // Check if user has edit permissions for this exchange or is admin
    const permissionService = require('../services/permissionService');
    const hasEditPermission = await permissionService.checkPermission(req.user.id, task.exchange_id, 'edit_tasks');
    
    // Allow if user has edit permission, created the task, or is admin
    if (!hasEditPermission && task.created_by !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        error: 'You do not have permission to delete this task' 
      });
    }
  } catch (permissionError) {
    console.error('Error checking task permissions:', permissionError);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to check permissions' 
    });
  }
  try {
    // First fetch the task to get exchange_id for real-time notification
    const { data: taskToDelete, error: fetchError } = await supabaseService.client
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !taskToDelete) {
      console.error('Error fetching task for deletion:', fetchError);
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found'
      });
    }

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

    // Emit real-time event for task deletion
    const exchangeId = taskToDelete.exchange_id;
    const io = req.app.get('io');
    if (io && exchangeId) {
      console.log(`📡 Emitting task_deleted to exchange_${exchangeId}`);
      io.to(`exchange_${exchangeId}`).emit('task_deleted', {
        exchangeId: exchangeId,
        taskId: req.params.id,
        task: taskToDelete,
        deletedBy: req.user.id
      });
      
      // Also emit to all connected users in the exchange (fallback)
      const databaseService = require('../services/database');
      const participants = await databaseService.getExchangeParticipants({
        where: { exchange_id: exchangeId }
      });
      
      participants.forEach(participant => {
        if (participant.user_id) {
          io.to(`user_${participant.user_id}`).emit('task_deleted', {
            exchangeId: exchangeId,
            taskId: req.params.id,
            task: taskToDelete,
            deletedBy: req.user.id
          });
        }
      });
    } else {
      console.warn('⚠️ Socket.IO not available for real-time task deletion notification');
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
router.post('/natural-language', authenticateToken, requireExchangePermission('create_tasks'), async (req, res) => {
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
router.post('/from-chat', authenticateToken, requireExchangePermission('create_tasks'), async (req, res) => {
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

// Task Rollover Endpoints
// ===========================

// Get rollover status and statistics
router.get('/rollover/status', authenticateToken, enforceRBAC(['admin', 'coordinator']), async (req, res) => {
  try {
    if (!taskRolloverService) {
      return res.status(503).json({
        success: false,
        error: 'Task rollover service not available'
      });
    }

    const stats = await taskRolloverService.getRolloverStatistics();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting rollover status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rollover status',
      details: error.message
    });
  }
});

// Trigger manual rollover (admin only)
router.post('/rollover/trigger', authenticateToken, enforceRBAC(['admin']), async (req, res) => {
  try {
    if (!taskRolloverService) {
      return res.status(503).json({
        success: false,
        error: 'Task rollover service not available'
      });
    }

    const { dryRun = false } = req.body;
    
    console.log(`📋 Manual task rollover triggered by ${req.user.email} (dry run: ${dryRun})`);
    
    const result = await taskRolloverService.rolloverTasks({
      dryRun,
      userId: req.user.id
    });
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error triggering rollover:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger rollover',
      details: error.message
    });
  }
});

// Rollover specific tasks
router.post('/rollover/tasks', authenticateToken, enforceRBAC(['admin', 'coordinator']), async (req, res) => {
  try {
    if (!taskRolloverService) {
      return res.status(503).json({
        success: false,
        error: 'Task rollover service not available'
      });
    }

    const { taskIds } = req.body;
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Task IDs array is required'
      });
    }
    
    console.log(`📋 Manual rollover of ${taskIds.length} tasks by ${req.user.email}`);
    
    const result = await taskRolloverService.rolloverSpecificTasks(taskIds, req.user.id);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error rolling over specific tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to rollover specific tasks',
      details: error.message
    });
  }
});

// Get rollover history for a task
router.get('/rollover/history/:taskId', authenticateToken, async (req, res) => {
  try {
    if (!taskRolloverService) {
      return res.status(503).json({
        success: false,
        error: 'Task rollover service not available'
      });
    }

    const history = await taskRolloverService.getTaskRolloverHistory(req.params.taskId);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error getting task rollover history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get rollover history',
      details: error.message
    });
  }
});

// Get valid assignees based on context (exchange vs dashboard)
router.get('/assignees/valid', authenticateToken, async (req, res) => {
  try {
    const { exchangeId, context = 'dashboard' } = req.query;
    
    console.log(`📋 Getting valid assignees for ${req.user?.email} - Context: ${context}, Exchange: ${exchangeId}`);

    let validAssignees = [];
    
    if (context === 'exchange' && exchangeId) {
      // Exchange context: Only get participants of the specific exchange
      console.log('🔍 Getting exchange participants...');
      
      const { data: participants, error: participantsError } = await supabaseService.client
        .from('exchange_participants')
        .select('contact_id')
        .eq('exchange_id', exchangeId)
        .eq('is_active', true);

      if (participantsError) {
        console.error('❌ Error fetching exchange participants:', participantsError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch exchange participants',
          details: participantsError.message
        });
      }

      console.log(`✅ Found ${participants?.length || 0} exchange participants`);

      // Get contact details for each participant
      const contactIds = (participants || []).map(p => p.contact_id).filter(id => id);
      let contactDetails = [];
      
      if (contactIds.length > 0) {
        const { data: contacts, error: contactsError } = await supabaseService.client
          .from('contacts')
          .select('id, first_name, last_name, email, role')
          .in('id', contactIds);
        
        contactDetails = contacts || [];
      }

      // Convert participants to assignee format
      validAssignees = (participants || []).map(p => {
        const contact = contactDetails.find(c => c.id === p.contact_id);
        return {
          id: p.contact_id,
          name: contact ? `${contact.first_name || ''} ${contact.last_name || ''}`.trim() : 'Unknown',
          email: contact?.email,
          role: contact?.role || 'contact',
          type: 'contact',
          context: 'exchange_participant'
        };
      }).filter(a => a.id && a.name !== 'Unknown');

    } else {
      // Dashboard context: Get participants from all user's exchanges
      console.log('🔍 Getting participants from all user exchanges...');
      
      // First get all exchanges the user has access to
      const { data: userExchanges, error: exchangesError } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id')
        .eq('contact_id', req.user.contact_id)
        .eq('is_active', true);

      if (exchangesError) {
        console.error('❌ Error fetching user exchanges:', exchangesError);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch user exchanges',
          details: exchangesError.message
        });
      }

      const exchangeIds = (userExchanges || []).map(e => e.exchange_id);
      console.log(`✅ User has access to ${exchangeIds.length} exchanges`);

      if (exchangeIds.length > 0) {
        // Get all participants from user's exchanges
        const { data: allParticipants, error: allParticipantsError } = await supabaseService.client
          .from('exchange_participants')
          .select('contact_id, exchange_id')
          .in('exchange_id', exchangeIds)
          .eq('is_active', true);

        if (allParticipantsError) {
          console.error('❌ Error fetching all participants:', allParticipantsError);
          return res.status(500).json({
            success: false,
            error: 'Failed to fetch participants',
            details: allParticipantsError.message
          });
        }

        console.log(`✅ Found ${allParticipants?.length || 0} total participants across exchanges`);

        // Get unique contact IDs
        const allContactIds = [...new Set((allParticipants || []).map(p => p.contact_id).filter(id => id))];
        let allContactDetails = [];
        
        if (allContactIds.length > 0) {
          const { data: contacts, error: contactsError } = await supabaseService.client
            .from('contacts')
            .select('id, first_name, last_name, email, role')
            .in('id', allContactIds);
          
          allContactDetails = contacts || [];
        }

        // Remove duplicates and convert to assignee format
        const uniqueParticipants = new Map();
        
        (allParticipants || []).forEach(p => {
          const key = p.contact_id;
          if (key && !uniqueParticipants.has(key)) {
            const contact = allContactDetails.find(c => c.id === p.contact_id);
            if (contact) {
              uniqueParticipants.set(key, {
                id: key,
                name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
                email: contact.email,
                role: contact.role || 'contact',
                type: 'contact',
                context: 'dashboard_all_exchanges'
              });
            }
          }
        });

        validAssignees = Array.from(uniqueParticipants.values()).filter(a => a.name !== '');
      }
    }

    console.log(`✅ Returning ${validAssignees.length} valid assignees for context: ${context}`);

    res.json({
      success: true,
      data: {
        assignees: validAssignees,
        context: context,
        exchangeId: exchangeId || null,
        total: validAssignees.length
      }
    });

  } catch (error) {
    console.error('❌ Error getting valid assignees:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get valid assignees',
      details: error.message
    });
  }
});

module.exports = router;