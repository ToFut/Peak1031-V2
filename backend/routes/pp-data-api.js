const router = require('express').Router();
const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, requireRole } = require('../middleware/auth');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * GET /api/pp-data/user/:userId
 * Get PP data related to a specific user (by email match)
 */
router.get('/user/:userId', authenticateToken, requireRole(['admin', 'coordinator']), async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Get user email first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', userId)
      .single();
    
    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get PP user by email match
    const { data: ppUser } = await supabase
      .from('pp_users')
      .select('*')
      .eq('email', userData.email)
      .single();
    
    // Get invoices for this user (if they're in PP as a user)
    let invoices = [];
    let totalRevenue = 0;
    let outstandingAmount = 0;
    
    if (ppUser) {
      // Get invoices where this user is involved
      const { data: ppInvoices } = await supabase
        .from('pp_invoices')
        .select('*')
        .or(`account_ref_display_name.ilike.%${userData.first_name}%,account_ref_display_name.ilike.%${userData.last_name}%`)
        .order('issue_date', { ascending: false })
        .limit(10);
      
      if (ppInvoices) {
        invoices = ppInvoices;
        totalRevenue = ppInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
        outstandingAmount = ppInvoices.reduce((sum, inv) => sum + (inv.total_outstanding || 0), 0);
      }
    }
    
    // Get tasks assigned to this user
    const { data: ppTasks } = await supabase
      .from('pp_tasks')
      .select('*')
      .or(`assigned_to_users.cs.{"display_name":"${userData.first_name} ${userData.last_name}"}`)
      .eq('status', 'NotCompleted')
      .order('due_date', { ascending: true })
      .limit(10);
    
    // Get expenses by this user
    const { data: ppExpenses } = await supabase
      .from('pp_expenses')
      .select('*')
      .or(`billed_by_user_ref.cs.{"display_name":"${userData.first_name} ${userData.last_name}"}`)
      .order('date', { ascending: false })
      .limit(10);
    
    const totalExpenses = ppExpenses ? ppExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) : 0;
    
    // Get recent notes
    const { data: ppNotes } = await supabase
      .from('pp_notes')
      .select('*')
      .or(`account_ref_display_name.ilike.%${userData.first_name}%,account_ref_display_name.ilike.%${userData.last_name}%`)
      .order('pp_created_at', { ascending: false })
      .limit(5);
    
    res.json({
      success: true,
      pp_data: {
        pp_user: ppUser,
        invoices: {
          recent: invoices,
          total_revenue: totalRevenue / 100, // Convert from cents
          outstanding_amount: outstandingAmount / 100,
          count: invoices.length
        },
        tasks: {
          active: ppTasks || [],
          overdue: ppTasks ? ppTasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length : 0,
          count: ppTasks ? ppTasks.length : 0
        },
        expenses: {
          recent: ppExpenses || [],
          total_amount: totalExpenses / 100,
          count: ppExpenses ? ppExpenses.length : 0
        },
        notes: {
          recent: ppNotes || [],
          count: ppNotes ? ppNotes.length : 0
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching PP data for user:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch PracticePanther data',
      message: error.message 
    });
  }
});

/**
 * GET /api/pp-data/exchange/:exchangeId
 * Get PP data related to a specific exchange (by matter name match)
 */
router.get('/exchange/:exchangeId', authenticateToken, async (req, res) => {
  try {
    const { exchangeId } = req.params;
    
    // Get exchange details
    const { data: exchangeData, error: exchangeError } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();
    
    if (exchangeError || !exchangeData) {
      return res.status(404).json({ error: 'Exchange not found' });
    }
    
    // Try to find related PP matter by name or property address
    const searchTerm = exchangeData.relinquished_property_address || exchangeData.replacement_property_address || '';
    
    // Get related tasks
    const { data: ppTasks } = await supabase
      .from('pp_tasks')
      .select('*')
      .or(`matter_ref_display_name.ilike.%${searchTerm}%,notes.ilike.%${searchTerm}%`)
      .order('due_date', { ascending: true });
    
    // Get related invoices
    const { data: ppInvoices } = await supabase
      .from('pp_invoices')
      .select('*')
      .or(`matter_ref_display_name.ilike.%${searchTerm}%`)
      .order('issue_date', { ascending: false });
    
    // Get related expenses
    const { data: ppExpenses } = await supabase
      .from('pp_expenses')
      .select('*')
      .or(`matter_ref_display_name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .order('date', { ascending: false });
    
    res.json({
      success: true,
      pp_data: {
        tasks: ppTasks || [],
        invoices: ppInvoices || [],
        expenses: ppExpenses || [],
        total_value: ppInvoices ? ppInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0) / 100 : 0,
        total_expenses: ppExpenses ? ppExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) / 100 : 0
      }
    });
    
  } catch (error) {
    console.error('Error fetching PP data for exchange:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch PracticePanther data',
      message: error.message 
    });
  }
});

/**
 * GET /api/pp-data/contact/:contactId
 * Get PP contact details with all phone numbers and fields
 */
router.get('/contact/:contactId', authenticateToken, async (req, res) => {
  try {
    const { contactId } = req.params;
    
    // Get contact from our database
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .select('*')
      .eq('id', contactId)
      .single();
    
    if (contactError || !contactData) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Find matching PP contact by email or name
    const { data: ppContact } = await supabase
      .from('pp_contacts')
      .select('*')
      .or(`email.eq.${contactData.email},display_name.ilike.%${contactData.first_name}%`)
      .single();
    
    // Get related tasks for this contact
    const { data: ppTasks } = await supabase
      .from('pp_tasks')
      .select('*')
      .or(`assigned_to_contacts.cs.{"display_name":"${contactData.first_name} ${contactData.last_name}"}`)
      .order('due_date', { ascending: true });
    
    // Get related notes
    const { data: ppNotes } = await supabase
      .from('pp_notes')
      .select('*')
      .or(`account_ref_display_name.ilike.%${contactData.first_name}%`)
      .order('pp_created_at', { ascending: false })
      .limit(10);
    
    res.json({
      success: true,
      pp_data: {
        contact: ppContact || null,
        tasks: ppTasks || [],
        notes: ppNotes || [],
        all_phones: ppContact ? {
          mobile: ppContact.phone_mobile,
          home: ppContact.phone_home,
          work: ppContact.phone_work,
          fax: ppContact.phone_fax
        } : null,
        custom_fields: ppContact?.custom_field_values || []
      }
    });
    
  } catch (error) {
    console.error('Error fetching PP data for contact:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch PracticePanther data',
      message: error.message 
    });
  }
});

/**
 * GET /api/pp-data/dashboard-metrics
 * Get aggregated PP metrics for dashboards
 */
router.get('/dashboard-metrics', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    
    // Get invoice metrics
    const { data: invoices } = await supabase
      .from('pp_invoices')
      .select('total, total_outstanding, issue_date');
    
    const totalRevenue = invoices ? invoices.reduce((sum, inv) => sum + (inv.total || 0), 0) / 100 : 0;
    const totalOutstanding = invoices ? invoices.reduce((sum, inv) => sum + (inv.total_outstanding || 0), 0) / 100 : 0;
    
    // Get current month revenue
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = invoices ? invoices
      .filter(inv => {
        const invDate = new Date(inv.issue_date);
        return invDate.getMonth() === currentMonth && invDate.getFullYear() === currentYear;
      })
      .reduce((sum, inv) => sum + (inv.total || 0), 0) / 100 : 0;
    
    // Get task metrics
    const { data: tasks } = await supabase
      .from('pp_tasks')
      .select('status, due_date, priority');
    
    const activeTasks = tasks ? tasks.filter(t => t.status === 'NotCompleted').length : 0;
    const overdueTasks = tasks ? tasks.filter(t => 
      t.status === 'NotCompleted' && t.due_date && new Date(t.due_date) < new Date()
    ).length : 0;
    const highPriorityTasks = tasks ? tasks.filter(t => 
      t.status === 'NotCompleted' && t.priority === 'High'
    ).length : 0;
    
    // Get expense metrics
    const { data: expenses } = await supabase
      .from('pp_expenses')
      .select('amount, date, is_billable, is_billed');
    
    const totalExpenses = expenses ? expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0) / 100 : 0;
    const unbilledExpenses = expenses ? expenses
      .filter(exp => exp.is_billable && !exp.is_billed)
      .reduce((sum, exp) => sum + (exp.amount || 0), 0) / 100 : 0;
    
    // Get user count
    const { count: ppUserCount } = await supabase
      .from('pp_users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);
    
    // Get contact count
    const { count: ppContactCount } = await supabase
      .from('pp_contacts')
      .select('*', { count: 'exact', head: true });
    
    res.json({
      success: true,
      metrics: {
        revenue: {
          total: totalRevenue,
          outstanding: totalOutstanding,
          monthly: monthlyRevenue,
          collection_rate: totalRevenue > 0 ? ((totalRevenue - totalOutstanding) / totalRevenue * 100).toFixed(1) : 0
        },
        tasks: {
          active: activeTasks,
          overdue: overdueTasks,
          high_priority: highPriorityTasks,
          completion_rate: tasks ? ((tasks.length - activeTasks) / tasks.length * 100).toFixed(1) : 0
        },
        expenses: {
          total: totalExpenses,
          unbilled: unbilledExpenses,
          billable_ratio: totalExpenses > 0 ? (unbilledExpenses / totalExpenses * 100).toFixed(1) : 0
        },
        counts: {
          pp_users: ppUserCount || 0,
          pp_contacts: ppContactCount || 0,
          total_invoices: invoices ? invoices.length : 0,
          total_tasks: tasks ? tasks.length : 0
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