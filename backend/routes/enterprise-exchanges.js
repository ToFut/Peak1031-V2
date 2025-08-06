/**
 * Enterprise Exchange Management Routes
 * Full lifecycle management with database integration
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

    // Extract user info from token or session
    // For now, we'll use a simple approach - in production, validate JWT
    req.user = { id: 'user-id', role: 'admin' }; // TODO: Implement proper auth
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// GET /api/enterprise-exchanges - Get all exchanges with lifecycle data (Admin view)
router.get('/', getUser, async (req, res) => {
  try {
    const { page = 1, limit = 20, stage, status, search, user_id } = req.query;
    const offset = (page - 1) * limit;

    // Build query based on user role
    let query = supabase
      .from('exchanges')
      .select(`
        *,
        exchange_participants!inner(
          id, role, is_active,
          contacts!inner(id, first_name, last_name, email, role)
        ),
        exchange_analytics(
          completion_percentage, days_in_current_stage, on_track
        ),
        compliance_checks(
          status, severity
        )
      `)
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    // Filter based on user role
    if (req.user.role !== 'admin') {
      // Non-admin users only see exchanges they're assigned to
      query = query.eq('exchange_participants.contact_id', req.user.id);
    }

    // Apply filters
    if (stage) query = query.eq('lifecycle_stage', stage);
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('name', `%${search}%`);

    const { data: exchanges, error, count } = await query;

    if (error) {
      console.error('Error fetching exchanges:', error);
      return res.status(500).json({ error: error.message });
    }

    // Transform data to include calculated fields
    const enrichedExchanges = exchanges.map(exchange => {
      const analytics = exchange.exchange_analytics?.[0] || {};
      const complianceIssues = exchange.compliance_checks?.filter(c => c.status === 'FAILED').length || 0;
      
      return {
        ...exchange,
        completionPercentage: analytics.completion_percentage || 0,
        daysInCurrentStage: analytics.days_in_current_stage || 0,
        onTrack: analytics.on_track !== false,
        complianceIssues,
        participantCount: exchange.exchange_participants?.length || 0,
        coordinatorName: exchange.exchange_participants?.find(p => p.role === 'coordinator')?.contacts?.first_name || 'Unassigned'
      };
    });

    res.json({
      exchanges: enrichedExchanges,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Error in GET /enterprise-exchanges:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/enterprise-exchanges/:id - Get single exchange with complete lifecycle data
router.get('/:id', getUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Get complete exchange data
    const { data: exchange, error } = await supabase
      .from('exchanges')
      .select(`
        *,
        exchange_participants(
          id, role, permissions, is_active, assigned_at,
          contacts(id, first_name, last_name, email, role, phone)
        ),
        messages(
          id, content, message_type, created_at,
          contacts(first_name, last_name)
        ),
        documents(
          id, file_name, file_type, file_size, lifecycle_stage,
          compliance_status, created_at, uploaded_by,
          contacts(first_name, last_name)
        ),
        tasks(
          id, title, description, status, priority, due_date,
          assigned_to, milestone_id, created_at,
          contacts(first_name, last_name)
        ),
        exchange_milestones(
          id, milestone_type, milestone_name, due_date, status,
          is_critical, completion_date
        ),
        financial_transactions(
          id, transaction_type, amount, transaction_date,
          status, description
        ),
        compliance_checks(
          id, check_type, check_name, status, severity,
          details, created_at
        ),
        risk_assessments(
          id, overall_risk_score, assessment_date,
          risk_factors, mitigation_strategies
        ),
        exchange_analytics(
          completion_percentage, days_in_current_stage,
          tasks_completed, tasks_remaining, on_track,
          projected_completion_date
        )
      `)
      .eq('id', id)
      .single();

    if (error || !exchange) {
      return res.status(404).json({ error: 'Exchange not found' });
    }

    // Check user permissions
    const userParticipant = exchange.exchange_participants?.find(p => p.contacts.id === req.user.id);
    if (req.user.role !== 'admin' && !userParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(exchange);

  } catch (error) {
    console.error('Error in GET /enterprise-exchanges/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/enterprise-exchanges/:id/advance-stage - Advance exchange to next stage
router.post('/:id/advance-stage', getUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { new_stage, reason } = req.body;

    // Check permissions
    const { data: participant } = await supabase
      .from('exchange_participants')
      .select('role, permissions')
      .eq('exchange_id', id)
      .eq('contact_id', req.user.id)
      .single();

    if (!participant && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Advance stage using database function
    const { data, error } = await supabase.rpc('advance_exchange_stage', {
      p_exchange_id: id,
      p_new_stage: new_stage,
      p_changed_by: req.user.id
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, new_stage: data });

  } catch (error) {
    console.error('Error advancing stage:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/enterprise-exchanges/:id/participants - Add participant to exchange
router.post('/:id/participants', getUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { contact_id, role, permissions = ['view'] } = req.body;

    // Use database function to assign user
    const { data, error } = await supabase.rpc('assign_user_to_exchange', {
      p_exchange_id: id,
      p_contact_id: contact_id,
      p_role: role,
      p_assigned_by: req.user.id,
      p_permissions: permissions
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true, participant_id: data });

  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/enterprise-exchanges/:id/timeline - Get exchange timeline/workflow history
router.get('/:id/timeline', getUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if Supabase is configured and the table exists
    if (!supabase) {
      console.warn('Supabase not configured, returning empty timeline');
      return res.json([]);
    }

    const { data: timeline, error } = await supabase
      .from('exchange_workflow_history')
      .select(`
        *,
        contacts(first_name, last_name, role)
      `)
      .eq('exchange_id', id)
      .order('changed_at', { ascending: false });

    if (error) {
      console.warn('Timeline table does not exist or query failed:', error.message);
      return res.json([]); // Return empty array instead of error
    }

    res.json(timeline || []);

  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.json([]); // Return empty array instead of 500 error
  }
});

// GET /api/enterprise-exchanges/:id/compliance - Get compliance status
router.get('/:id/compliance', getUser, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if Supabase is configured
    if (!supabase) {
      console.warn('Supabase not configured, returning empty compliance data');
      return res.json({
        checks: [],
        score: 0,
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      });
    }

    const { data: compliance, error } = await supabase
      .from('compliance_checks')
      .select('*')
      .eq('exchange_id', id)
      .order('check_date', { ascending: false });

    if (error) {
      console.warn('Compliance table does not exist or query failed:', error.message);
      return res.json({
        checks: [],
        score: 0,
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      });
    }

    // Calculate compliance score
    const total = compliance?.length || 0;
    const passed = compliance?.filter(c => c.status === 'PASSED').length || 0;
    const score = total > 0 ? (passed / total) * 100 : 0;

    res.json({
      checks: compliance || [],
      score: Math.round(score),
      total,
      passed,
      failed: compliance?.filter(c => c.status === 'FAILED').length || 0,
      warnings: compliance?.filter(c => c.status === 'WARNING').length || 0
    });

  } catch (error) {
    console.error('Error fetching compliance:', error);
    // Return empty compliance data instead of error
    res.json({
      checks: [],
      score: 0,
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    });
  }
});

// POST /api/enterprise-exchanges/:id/calculate-deadlines - Calculate 45/180 day deadlines
router.post('/:id/calculate-deadlines', getUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { sale_date } = req.body;

    const { error } = await supabase.rpc('calculate_exchange_deadlines', {
      p_exchange_id: id,
      p_sale_date: sale_date
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Error calculating deadlines:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/enterprise-exchanges/dashboard/stats - Get dashboard statistics
router.get('/dashboard/stats', getUser, async (req, res) => {
  try {
    // Get various statistics based on user role
    const isAdmin = req.user.role === 'admin';

    let exchangeFilter = '';
    if (!isAdmin) {
      exchangeFilter = `AND EXISTS (
        SELECT 1 FROM exchange_participants ep 
        WHERE ep.exchange_id = e.id AND ep.contact_id = '${req.user.id}'
      )`;
    }

    // Get counts by stage
    const { data: stageStats } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT lifecycle_stage, COUNT(*) as count
        FROM exchanges e
        WHERE status != 'CLOSED' ${exchangeFilter}
        GROUP BY lifecycle_stage
      `
    });

    // Get overdue items
    const { data: overdueStats } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT COUNT(*) as overdue_milestones
        FROM exchange_milestones em
        JOIN exchanges e ON em.exchange_id = e.id
        WHERE em.due_date < CURRENT_DATE 
        AND em.status = 'PENDING'
        AND e.status != 'CLOSED' ${exchangeFilter}
      `
    });

    // Get compliance summary
    const { data: complianceStats } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          compliance_status,
          COUNT(*) as count
        FROM exchanges e
        WHERE status != 'CLOSED' ${exchangeFilter}
        GROUP BY compliance_status
      `
    });

    res.json({
      stageBreakdown: stageStats || [],
      overdueItems: overdueStats?.[0]?.overdue_milestones || 0,
      complianceBreakdown: complianceStats || []
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;