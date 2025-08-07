/**
 * Unified Data API
 * Returns data from main tables that include both local and PP-synced data
 * No separate PP queries - everything comes from unified tables
 */

const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken } = require('../middleware/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/unified/user/:userId
 * Get unified user data including invoices, tasks, expenses from main tables
 */
router.get('/user/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user with PP fields
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*, pp_user_id, pp_display_name')
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get tasks assigned to this user
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId)
      .order('due_date', { ascending: true });
    
    // Get invoices related to this user
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('user_id', userId)
      .order('issue_date', { ascending: false });
    
    // Get expenses by this user
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('expense_date', { ascending: false });
    
    // Calculate summary metrics
    const totalRevenue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
    const outstandingAmount = invoices?.reduce((sum, inv) => sum + (inv.total_outstanding || 0), 0) || 0;
    const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
    const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
    const overdueTasks = tasks?.filter(t => 
      t.status === 'pending' && t.due_date && new Date(t.due_date) < new Date()
    ).length || 0;
    
    res.json({
      success: true,
      data: {
        user: userData,
        metrics: {
          total_revenue: totalRevenue,
          outstanding_amount: outstandingAmount,
          total_expenses: totalExpenses,
          pending_tasks: pendingTasks,
          overdue_tasks: overdueTasks
        },
        tasks: tasks || [],
        invoices: invoices || [],
        expenses: expenses || []
      }
    });
    
  } catch (error) {
    console.error('Error fetching unified user data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user data',
      message: error.message 
    });
  }
});

/**
 * GET /api/unified/exchange/:exchangeId
 * Get unified exchange data including all related information
 */
router.get('/exchange/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    
    // Get exchange with PP fields
    const { data: exchangeData, error: exchangeError } = await supabase
      .from('exchanges')
      .select('*, pp_matter_id, pp_matter_number, pp_matter_status')
      .eq('id', exchangeId)
      .single();
    
    if (exchangeError || !exchangeData) {
      return res.status(404).json({ error: 'Exchange not found' });
    }
    
    // Get related tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('exchange_id', exchangeId)
      .order('due_date', { ascending: true });
    
    // Get related invoices
    const { data: invoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('exchange_id', exchangeId)
      .order('issue_date', { ascending: false });
    
    // Get related expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('exchange_id', exchangeId)
      .order('expense_date', { ascending: false });
    
    // Get related documents
    const { data: documents } = await supabase
      .from('documents')
      .select('*')
      .eq('exchange_id', exchangeId)
      .order('created_at', { ascending: false });
    
    // Get related contacts
    const { data: contacts } = await supabase
      .from('exchange_contacts')
      .select('*, contact:contacts(*)')
      .eq('exchange_id', exchangeId);
    
    // Calculate metrics
    const totalValue = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0;
    const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
    const pendingTasks = tasks?.filter(t => t.status === 'pending').length || 0;
    
    res.json({
      success: true,
      data: {
        exchange: exchangeData,
        metrics: {
          total_value: totalValue,
          total_expenses: totalExpenses,
          pending_tasks: pendingTasks,
          document_count: documents?.length || 0,
          contact_count: contacts?.length || 0
        },
        tasks: tasks || [],
        invoices: invoices || [],
        expenses: expenses || [],
        documents: documents || [],
        contacts: contacts?.map(c => c.contact) || []
      }
    });
    
  } catch (error) {
    console.error('Error fetching unified exchange data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch exchange data',
      message: error.message 
    });
  }
});

/**
 * GET /api/unified/contact/:contactId
 * Get unified contact data with all fields
 */
router.get('/contact/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    
    // Get contact with all PP fields
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();
    
    if (contactError || !contactData) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Get exchanges this contact is involved in
    const { data: exchanges } = await supabase
      .from('exchange_contacts')
      .select('*, exchange:exchanges(*)')
      .eq('contact_id', contactId);
    
    // Get tasks assigned to this contact
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .contains('assigned_to_contacts', [{ contact_id: contactId }])
      .order('due_date', { ascending: true });
    
    // Get notes related to this contact
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    
    res.json({
      success: true,
      data: {
        contact: contactData,
        // All phone numbers from PP sync
        phones: {
          mobile: contactData.phone_mobile,
          home: contactData.phone_home,
          work: contactData.phone_work,
          fax: contactData.phone_fax,
          primary: contactData.phone // Original phone field
        },
        custom_fields: contactData.custom_field_values || {},
        exchanges: exchanges?.map(e => e.exchange) || [],
        tasks: tasks || [],
        notes: notes || []
      }
    });
    
  } catch (error) {
    console.error('Error fetching unified contact data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch contact data',
      message: error.message 
    });
  }
});

/**
 * GET /api/unified/dashboard
 * Get unified dashboard metrics combining local and PP data
 */
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;
    
    // Base query filters based on role
    let exchangeFilter = {};
    let taskFilter = {};
    
    if (userRole === 'client') {
      exchangeFilter = { client_id: userId };
      taskFilter = { assigned_to: userId };
    } else if (userRole === 'coordinator') {
      exchangeFilter = { coordinator_id: userId };
      taskFilter = { assigned_to: userId };
    }
    
    // Get exchanges
    const { data: exchanges, count: exchangeCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact' })
      .match(exchangeFilter);
    
    // Get tasks
    const { data: tasks, count: taskCount } = await supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .match(taskFilter);
    
    // Get invoices (admin/coordinator only)
    let invoiceMetrics = { total: 0, outstanding: 0, count: 0 };
    if (userRole === 'admin' || userRole === 'coordinator') {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, total_outstanding');
      
      invoiceMetrics = {
        total: invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0,
        outstanding: invoices?.reduce((sum, inv) => sum + (inv.total_outstanding || 0), 0) || 0,
        count: invoices?.length || 0
      };
    }
    
    // Get expense metrics
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, is_billable, is_billed');
    
    const expenseMetrics = {
      total: expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0,
      unbilled: expenses?.filter(e => e.is_billable && !e.is_billed)
        .reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0,
      count: expenses?.length || 0
    };
    
    // Calculate task metrics
    const activeTasks = tasks?.filter(t => t.status === 'pending') || [];
    const overdueTasks = activeTasks.filter(t => 
      t.due_date && new Date(t.due_date) < new Date()
    );
    const highPriorityTasks = activeTasks.filter(t => t.priority === 'high');
    
    // Calculate exchange metrics
    const activeExchanges = exchanges?.filter(e => e.status === 'active') || [];
    const completedExchanges = exchanges?.filter(e => e.status === 'completed') || [];
    
    res.json({
      success: true,
      metrics: {
        exchanges: {
          total: exchangeCount || 0,
          active: activeExchanges.length,
          completed: completedExchanges.length
        },
        tasks: {
          total: taskCount || 0,
          pending: activeTasks.length,
          overdue: overdueTasks.length,
          high_priority: highPriorityTasks.length
        },
        invoices: invoiceMetrics,
        expenses: expenseMetrics,
        // Data source indicator
        data_sources: {
          has_pp_data: exchanges?.some(e => e.pp_matter_id) || false,
          last_pp_sync: exchanges?.find(e => e.pp_synced_at)?.pp_synced_at || null
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch dashboard metrics',
      message: error.message 
    });
  }
});

module.exports = router;