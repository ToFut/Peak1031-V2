const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createClient } = require('@supabase/supabase-js');
const AuditService = require('../services/audit');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// Get audit logs with pagination and filtering
router.get('/', authenticateToken, requireRole(['admin', 'coordinator']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      user_id,
      entity_type,
      date_from,
      date_to,
      search,
      severity
    } = req.query;

    console.log('📋 Fetching audit logs with filters:', {
      page, limit, action, user_id, entity_type, date_from, date_to, search, severity
    });

    let query = supabase
      .from('audit_logs')
      .select(`
        *,
        user:person_id(id, first_name, last_name, email)
      `);

    // Apply filters
    if (action && action !== 'all') {
      query = query.eq('action', action);
    }

    if (user_id && user_id !== 'all') {
      query = query.eq('person_id', user_id);
    }

    if (entity_type && entity_type !== 'all') {
      query = query.eq('entity_type', entity_type);
    }

    if (date_from) {
      query = query.gte('created_at', date_from);
    }

    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    if (search) {
      query = query.or(`action.ilike.%${search}%,details->>'description'.ilike.%${search}%`);
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching audit logs:', error);
      throw error;
    }

    // Get total count for pagination
    const { count: totalCount, error: countError } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting count:', countError);
    }

    // Format the response
    const formattedLogs = (logs || []).map(log => ({
      id: log.id,
      action: log.action,
      entity_type: log.entity_type || 'system',
      entity_id: log.entity_id,
      details: log.details || {},
      user_id: log.person_id,
      userName: log.user ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() : 'System',
      userEmail: log.user?.email || 'system@platform.com',
      ip: log.ip_address,
      userAgent: log.user_agent,
      timestamp: log.created_at,
      created_at: log.created_at,
      severity: log.details?.severity || 'info',
      exchangeId: log.details?.exchangeId || null
    }));

    console.log(`✅ Fetched ${formattedLogs.length} audit logs`);

    res.json({
      success: true,
      data: formattedLogs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    });

  } catch (error) {
    console.error('❌ Error in audit logs endpoint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit logs',
      message: error.message
    });
  }
});

// Get audit log statistics
router.get('/stats', authenticateToken, requireRole(['admin', 'coordinator']), async (req, res) => {
  try {
    console.log('📊 Fetching audit log statistics');

    // Get total count
    const { count: total } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true });

    // Get today's count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString());

    // Get warnings and errors
    const { count: warnings } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .or('action.eq.LOGIN_FAILED,action.eq.UNAUTHORIZED_ACCESS,details->>severity.eq.warning');

    const { count: errors } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .or('action.eq.APPLICATION_ERROR,details->>severity.eq.error');

    // Get unique users count
    const { data: uniqueUsers } = await supabase
      .from('audit_logs')
      .select('person_id')
      .not('person_id', 'is', null);

    const uniqueUserIds = [...new Set((uniqueUsers || []).map(u => u.person_id))];

    // Get unique actions count
    const { data: uniqueActions } = await supabase
      .from('audit_logs')
      .select('action');

    const uniqueActionTypes = [...new Set((uniqueActions || []).map(a => a.action))];

    const stats = {
      total: total || 0,
      today: todayCount || 0,
      warnings: warnings || 0,
      errors: errors || 0,
      users: uniqueUserIds.length,
      actions: uniqueActionTypes.length
    };

    console.log('✅ Audit log statistics:', stats);

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Error fetching audit log stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log statistics',
      message: error.message
    });
  }
});

// Get unique actions for filtering
router.get('/actions', authenticateToken, requireRole(['admin', 'coordinator']), async (req, res) => {
  try {
    const { data: actions, error } = await supabase
      .from('audit_logs')
      .select('action')
      .order('action');

    if (error) throw error;

    const uniqueActions = [...new Set((actions || []).map(a => a.action))];

    res.json({
      success: true,
      data: uniqueActions.map(action => ({
        label: action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()),
        value: action
      }))
    });

  } catch (error) {
    console.error('❌ Error fetching audit actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit actions',
      message: error.message
    });
  }
});

// Get audit log by ID
router.get('/:id', authenticateToken, requireRole(['admin', 'coordinator']), async (req, res) => {
  try {
    const { id } = req.params;

    const { data: log, error } = await supabase
      .from('audit_logs')
      .select(`
        *,
        user:person_id(id, first_name, last_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!log) {
      return res.status(404).json({
        success: false,
        error: 'Audit log not found'
      });
    }

    const formattedLog = {
      id: log.id,
      action: log.action,
      entity_type: log.entity_type || 'system',
      entity_id: log.entity_id,
      details: log.details || {},
      user_id: log.person_id,
      userName: log.user ? `${log.user.first_name || ''} ${log.user.last_name || ''}`.trim() : 'System',
      userEmail: log.user?.email || 'system@platform.com',
      ip: log.ip_address,
      userAgent: log.user_agent,
      timestamp: log.created_at,
      created_at: log.created_at,
      severity: log.details?.severity || 'info',
      exchangeId: log.details?.exchangeId || null
    };

    res.json({
      success: true,
      data: formattedLog
    });

  } catch (error) {
    console.error('❌ Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log',
      message: error.message
    });
  }
});

module.exports = router;