/**
 * Account Management Routes
 * User profile, preferences, and account settings
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Middleware to get user from session
const getUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    // TODO: Implement proper JWT validation
    req.user = { id: 'user-id', role: 'admin' };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// GET /api/account/profile - Get user profile
router.get('/profile', getUser, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('contacts')
      .select(`
        id, first_name, last_name, middle_name, email, phone,
        role, is_user, is_active, company, 
        address_street, address_city, address_state, address_zip_code,
        phone_mobile, phone_work, phone_home,
        email_verified, two_fa_enabled, last_login,
        preferences, created_at, updated_at,
        exchange_participants(
          exchange_id,
          role,
          exchanges(id, name, status, lifecycle_stage)
        )
      `)
      .eq('id', req.user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Get activity statistics
    const { data: activityStats } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          (SELECT COUNT(*) FROM exchange_participants ep 
           JOIN exchanges e ON ep.exchange_id = e.id 
           WHERE ep.contact_id = '${req.user.id}' AND e.status != 'CLOSED') as active_exchanges,
          (SELECT COUNT(*) FROM tasks 
           WHERE assigned_to = '${req.user.id}' AND status = 'PENDING') as pending_tasks,
          (SELECT COUNT(*) FROM messages 
           WHERE sender_id = '${req.user.id}' 
           AND created_at > NOW() - INTERVAL '30 days') as messages_sent_30d,
          (SELECT COUNT(*) FROM documents 
           WHERE uploaded_by = '${req.user.id}' 
           AND created_at > NOW() - INTERVAL '30 days') as documents_uploaded_30d
      `
    });

    const stats = activityStats?.[0] || {
      active_exchanges: 0,
      pending_tasks: 0,
      messages_sent_30d: 0,
      documents_uploaded_30d: 0
    };

    res.json({
      profile,
      stats
    });

  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/account/profile - Update user profile
router.put('/profile', getUser, async (req, res) => {
  try {
    const {
      first_name, last_name, middle_name, email, phone,
      company, address_street, address_city, address_state, address_zip_code,
      phone_mobile, phone_work, phone_home, preferences
    } = req.body;

    const { data: updated, error } = await supabase
      .from('contacts')
      .update({
        first_name,
        last_name,
        middle_name,
        email,
        phone,
        company,
        address_street,
        address_city,
        address_state,
        address_zip_code,
        phone_mobile,
        phone_work,
        phone_home,
        preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Log the profile update
    await supabase
      .from('audit_logs')
      .insert({
        user_id: req.user.id,
        action: 'profile_updated',
        resource_type: 'user_profile',
        resource_id: req.user.id,
        new_values: { 
          first_name, last_name, email, phone 
        }
      });

    res.json(updated);

  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/account/preferences - Get user preferences
router.get('/preferences', getUser, async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('contacts')
      .select('preferences')
      .eq('id', req.user.id)
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const defaultPreferences = {
      notifications: {
        email: true,
        sms: false,
        push: true,
        milestone_alerts: true,
        task_reminders: true,
        document_notifications: true,
        chat_notifications: true
      },
      dashboard: {
        default_view: 'overview',
        items_per_page: 20,
        show_completed_tasks: false,
        compact_view: false
      },
      privacy: {
        profile_visibility: 'team',
        activity_tracking: true,
        analytics_participation: true
      }
    };

    const preferences = { ...defaultPreferences, ...(user.preferences || {}) };
    res.json(preferences);

  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/account/preferences - Update user preferences
router.put('/preferences', getUser, async (req, res) => {
  try {
    const preferences = req.body;

    const { error } = await supabase
      .from('contacts')
      .update({ preferences })
      .eq('id', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/account/activity - Get user activity log
router.get('/activity', getUser, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const { data: activities, error } = await supabase
      .from('audit_logs')
      .select(`
        id, action, resource_type, resource_name,
        created_at, metadata,
        exchange_id,
        exchanges(name)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Format activities for display
    const formattedActivities = activities.map(activity => ({
      ...activity,
      displayText: formatActivityText(activity),
      exchangeName: activity.exchanges?.name
    }));

    res.json(formattedActivities);

  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/account/notifications - Get user notifications
router.get('/notifications', getUser, async (req, res) => {
  try {
    const { unread_only = false, limit = 50 } = req.query;

    let query = supabase
      .from('notifications')
      .select(`
        id, type, title, content, priority,
        is_read, read_at, created_at,
        exchange_id,
        exchanges(name)
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unread_only === 'true') {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(notifications);

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/account/notifications/:id/mark-read - Mark notification as read
router.put('/notifications/:id/mark-read', getUser, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/account/dashboard-data - Get personalized dashboard data
router.get('/dashboard-data', getUser, async (req, res) => {
  try {
    // Get user's assigned exchanges
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select(`
        id, name, status, lifecycle_stage, 
        identification_deadline, exchange_deadline,
        completion_percentage: exchange_analytics(completion_percentage),
        risk_level, compliance_status
      `)
      .eq('exchange_participants.contact_id', req.user.id)
      .limit(10);

    // Get pending tasks
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select(`
        id, title, priority, due_date, 
        exchange_id,
        exchanges(name)
      `)
      .eq('assigned_to', req.user.id)
      .eq('status', 'PENDING')
      .order('due_date', { ascending: true })
      .limit(10);

    // Get recent messages
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select(`
        id, content, created_at,
        exchange_id,
        exchanges(name),
        contacts(first_name, last_name)
      `)
      .in('exchange_id', exchanges?.map(e => e.id) || [])
      .order('created_at', { ascending: false })
      .limit(10);

    // Get upcoming deadlines
    const { data: deadlines, error: deadlinesError } = await supabase
      .from('exchange_milestones')
      .select(`
        id, milestone_name, due_date, milestone_type,
        exchange_id,
        exchanges(name)
      `)
      .in('exchange_id', exchanges?.map(e => e.id) || [])
      .eq('status', 'PENDING')
      .gte('due_date', new Date().toISOString())
      .order('due_date', { ascending: true })
      .limit(10);

    res.json({
      exchanges: exchanges || [],
      tasks: tasks || [],
      messages: messages || [],
      deadlines: deadlines || []
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to format activity text
function formatActivityText(activity) {
  const actions = {
    'login': 'Logged into the system',
    'profile_updated': 'Updated profile information',
    'exchange_assigned': `Assigned to exchange: ${activity.exchanges?.name}`,
    'document_uploaded': 'Uploaded a document',
    'task_completed': 'Completed a task',
    'message_sent': 'Sent a message',
    'stage_advanced': 'Advanced exchange stage'
  };

  return actions[activity.action] || `Performed action: ${activity.action}`;
}

module.exports = router;