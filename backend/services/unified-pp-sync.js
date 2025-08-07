/**
 * Unified PracticePanther Sync Service
 * Syncs PP data directly into main database tables
 * No separate pp_ tables - single source of truth
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

class UnifiedPPSyncService {
  constructor(tokenManager) {
    this.tokenManager = tokenManager;
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }

  /**
   * Sync contacts from PP directly into contacts table
   */
  async syncContacts(since = null) {
    console.log('📧 Syncing PP contacts to main contacts table...');
    
    try {
      const token = await this.tokenManager.getValidAccessToken();
      const params = { per_page: 1000 };
      if (since) params.updated_since = since;
      
      const response = await axios.get('https://app.practicepanther.com/api/v2/contacts', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        params
      });
      
      const ppContacts = response.data || [];
      console.log(`Found ${ppContacts.length} contacts to sync`);
      
      if (ppContacts.length === 0) return { synced: 0, errors: 0 };
      
      // Transform and upsert into main contacts table
      const contactsToUpsert = ppContacts.map(contact => ({
        pp_id: contact.id,
        first_name: contact.first_name || contact.display_name?.split(' ')[0],
        last_name: contact.last_name || contact.display_name?.split(' ').slice(1).join(' '),
        email: contact.email,
        phone_mobile: contact.phone_mobile,
        phone_home: contact.phone_home,
        phone_work: contact.phone_work,
        phone_fax: contact.phone_fax,
        account_ref_id: contact.account_ref?.id,
        account_ref_name: contact.account_ref?.display_name,
        is_primary_contact: contact.is_primary_contact || false,
        custom_field_values: contact.custom_field_values,
        pp_synced_at: new Date().toISOString(),
        pp_created_at: contact.created_at,
        pp_updated_at: contact.updated_at
      }));
      
      // Upsert based on pp_id
      const { data, error } = await this.supabase
        .from('contacts')
        .upsert(contactsToUpsert, { 
          onConflict: 'pp_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ Error syncing contacts:', error.message);
        return { synced: 0, errors: ppContacts.length };
      }
      
      console.log(`✅ Synced ${ppContacts.length} contacts to main table`);
      return { synced: ppContacts.length, errors: 0 };
      
    } catch (error) {
      console.error('❌ Contact sync failed:', error.message);
      return { synced: 0, errors: 1 };
    }
  }

  /**
   * Sync tasks from PP directly into tasks table
   */
  async syncTasks(since = null) {
    console.log('📋 Syncing PP tasks to main tasks table...');
    
    try {
      const token = await this.tokenManager.getValidAccessToken();
      const params = { per_page: 1000 };
      if (since) params.updated_since = since;
      
      const response = await axios.get('https://app.practicepanther.com/api/v2/tasks', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        params
      });
      
      const ppTasks = response.data || [];
      console.log(`Found ${ppTasks.length} tasks to sync`);
      
      if (ppTasks.length === 0) return { synced: 0, errors: 0 };
      
      // First, try to match tasks with existing exchanges by matter
      const matterIds = [...new Set(ppTasks.map(t => t.matter_ref?.id).filter(Boolean))];
      const { data: exchanges } = await this.supabase
        .from('exchanges')
        .select('id, pp_matter_id')
        .in('pp_matter_id', matterIds);
      
      const matterToExchangeMap = {};
      exchanges?.forEach(ex => {
        matterToExchangeMap[ex.pp_matter_id] = ex.id;
      });
      
      // Transform and upsert into main tasks table
      const tasksToUpsert = ppTasks.map(task => ({
        pp_id: task.id,
        title: task.subject,
        description: task.notes,
        status: task.status === 'Completed' ? 'completed' : 'pending',
        priority: (task.priority || 'normal').toLowerCase(),
        due_date: task.due_date,
        exchange_id: matterToExchangeMap[task.matter_ref?.id] || null,
        matter_ref_id: task.matter_ref?.id,
        matter_ref_name: task.matter_ref?.display_name,
        assigned_to_users: task.assigned_to_users,
        assigned_to_contacts: task.assigned_to_contacts,
        tags: task.tags,
        pp_synced_at: new Date().toISOString(),
        pp_created_at: task.created_at,
        pp_updated_at: task.updated_at
      }));
      
      const { data, error } = await this.supabase
        .from('tasks')
        .upsert(tasksToUpsert, { 
          onConflict: 'pp_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ Error syncing tasks:', error.message);
        return { synced: 0, errors: ppTasks.length };
      }
      
      console.log(`✅ Synced ${ppTasks.length} tasks to main table`);
      return { synced: ppTasks.length, errors: 0 };
      
    } catch (error) {
      console.error('❌ Task sync failed:', error.message);
      return { synced: 0, errors: 1 };
    }
  }

  /**
   * Sync invoices from PP into invoices table
   */
  async syncInvoices(since = null) {
    console.log('💰 Syncing PP invoices to invoices table...');
    
    try {
      const token = await this.tokenManager.getValidAccessToken();
      const params = { per_page: 1000 };
      if (since) params.updated_since = since;
      
      const response = await axios.get('https://app.practicepanther.com/api/v2/invoices', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        params
      });
      
      const ppInvoices = response.data || [];
      console.log(`Found ${ppInvoices.length} invoices to sync`);
      
      if (ppInvoices.length === 0) return { synced: 0, errors: 0 };
      
      // Match invoices with exchanges and contacts
      const matterIds = [...new Set(ppInvoices.map(i => i.matter_ref?.id).filter(Boolean))];
      const { data: exchanges } = await this.supabase
        .from('exchanges')
        .select('id, pp_matter_id')
        .in('pp_matter_id', matterIds);
      
      const matterToExchangeMap = {};
      exchanges?.forEach(ex => {
        matterToExchangeMap[ex.pp_matter_id] = ex.id;
      });
      
      // Match contacts by account ref
      const accountIds = [...new Set(ppInvoices.map(i => i.account_ref?.id).filter(Boolean))];
      const { data: contacts } = await this.supabase
        .from('contacts')
        .select('id, account_ref_id')
        .in('account_ref_id', accountIds);
      
      const accountToContactMap = {};
      contacts?.forEach(c => {
        accountToContactMap[c.account_ref_id] = c.id;
      });
      
      const invoicesToUpsert = ppInvoices.map(invoice => ({
        pp_id: invoice.id,
        exchange_id: matterToExchangeMap[invoice.matter_ref?.id] || null,
        contact_id: accountToContactMap[invoice.account_ref?.id] || null,
        invoice_number: invoice.id,
        issue_date: invoice.issue_date?.split('T')[0],
        due_date: invoice.due_date?.split('T')[0],
        status: invoice.total_outstanding === 0 ? 'paid' : 
                invoice.total_paid > 0 ? 'partial' : 'unpaid',
        invoice_type: invoice.invoice_type,
        subtotal: (invoice.subtotal || 0) / 100,
        tax: (invoice.tax || 0) / 100,
        discount: (invoice.discount || 0) / 100,
        total: (invoice.total || 0) / 100,
        total_paid: (invoice.total_paid || 0) / 100,
        total_outstanding: (invoice.total_outstanding || 0) / 100,
        items_time_entries: invoice.items_time_entries,
        items_expenses: invoice.items_expenses,
        items_flat_fees: invoice.items_flat_fees,
        pp_account_ref_id: invoice.account_ref?.id,
        pp_matter_ref_id: invoice.matter_ref?.id,
        pp_synced_at: new Date().toISOString(),
        created_at: invoice.created_at,
        updated_at: invoice.updated_at
      }));
      
      const { data, error } = await this.supabase
        .from('invoices')
        .upsert(invoicesToUpsert, { 
          onConflict: 'pp_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ Error syncing invoices:', error.message);
        return { synced: 0, errors: ppInvoices.length };
      }
      
      console.log(`✅ Synced ${ppInvoices.length} invoices to main table`);
      return { synced: ppInvoices.length, errors: 0 };
      
    } catch (error) {
      console.error('❌ Invoice sync failed:', error.message);
      return { synced: 0, errors: 1 };
    }
  }

  /**
   * Sync expenses from PP into expenses table
   */
  async syncExpenses(since = null) {
    console.log('💵 Syncing PP expenses to expenses table...');
    
    try {
      const token = await this.tokenManager.getValidAccessToken();
      const params = { per_page: 1000 };
      if (since) params.updated_since = since;
      
      const response = await axios.get('https://app.practicepanther.com/api/v2/expenses', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        params
      });
      
      const ppExpenses = response.data || [];
      console.log(`Found ${ppExpenses.length} expenses to sync`);
      
      if (ppExpenses.length === 0) return { synced: 0, errors: 0 };
      
      // Match with exchanges
      const matterIds = [...new Set(ppExpenses.map(e => e.matter_ref?.id).filter(Boolean))];
      const { data: exchanges } = await this.supabase
        .from('exchanges')
        .select('id, pp_matter_id')
        .in('pp_matter_id', matterIds);
      
      const matterToExchangeMap = {};
      exchanges?.forEach(ex => {
        matterToExchangeMap[ex.pp_matter_id] = ex.id;
      });
      
      const expensesToUpsert = ppExpenses.map(expense => ({
        pp_id: expense.id,
        exchange_id: matterToExchangeMap[expense.matter_ref?.id] || null,
        description: expense.description,
        expense_date: expense.date?.split('T')[0],
        quantity: expense.qty || 1,
        price: (expense.price || 0) / 100,
        amount: (expense.amount || 0) / 100,
        is_billable: expense.is_billable || false,
        is_billed: expense.is_billed || false,
        private_notes: expense.private_notes,
        pp_matter_ref_id: expense.matter_ref?.id,
        pp_account_ref_id: expense.account_ref?.id,
        pp_expense_category_ref: expense.expense_category_ref,
        pp_billed_by_user_ref: expense.billed_by_user_ref,
        pp_synced_at: new Date().toISOString(),
        created_at: expense.created_at,
        updated_at: expense.updated_at
      }));
      
      const { data, error } = await this.supabase
        .from('expenses')
        .upsert(expensesToUpsert, { 
          onConflict: 'pp_id',
          ignoreDuplicates: false 
        });
      
      if (error) {
        console.error('❌ Error syncing expenses:', error.message);
        return { synced: 0, errors: ppExpenses.length };
      }
      
      console.log(`✅ Synced ${ppExpenses.length} expenses to main table`);
      return { synced: ppExpenses.length, errors: 0 };
      
    } catch (error) {
      console.error('❌ Expense sync failed:', error.message);
      return { synced: 0, errors: 1 };
    }
  }

  /**
   * Sync matters from PP to exchanges table
   */
  async syncMatters(since = null) {
    console.log('⚖️ Syncing PP matters to exchanges table...');
    
    try {
      const token = await this.tokenManager.getValidAccessToken();
      const params = { per_page: 1000 };
      if (since) params.updated_since = since;
      
      const response = await axios.get('https://app.practicepanther.com/api/v2/matters', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        params
      });
      
      const ppMatters = response.data || [];
      console.log(`Found ${ppMatters.length} matters to sync`);
      
      if (ppMatters.length === 0) return { synced: 0, errors: 0 };
      
      // Update existing exchanges with PP matter data
      for (const matter of ppMatters) {
        // First check if exchange exists with this matter ID
        const { data: existing } = await this.supabase
          .from('exchanges')
          .select('id')
          .eq('pp_matter_id', matter.id)
          .single();
        
        if (existing) {
          // Update existing exchange
          await this.supabase
            .from('exchanges')
            .update({
              pp_matter_number: matter.matter_number,
              pp_matter_status: matter.status,
              pp_practice_area: matter.practice_area,
              pp_responsible_attorney: matter.responsible_attorney,
              pp_opened_date: matter.opened_date,
              pp_closed_date: matter.closed_date,
              pp_synced_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        } else {
          // Create new exchange from matter
          await this.supabase
            .from('exchanges')
            .insert({
              pp_matter_id: matter.id,
              pp_matter_number: matter.matter_number,
              name: matter.display_name || matter.matter_number,
              status: matter.status === 'Closed' ? 'completed' : 'active',
              pp_matter_status: matter.status,
              pp_practice_area: matter.practice_area,
              pp_responsible_attorney: matter.responsible_attorney,
              pp_opened_date: matter.opened_date,
              pp_closed_date: matter.closed_date,
              pp_synced_at: new Date().toISOString(),
              created_at: matter.created_at
            });
        }
      }
      
      console.log(`✅ Synced ${ppMatters.length} matters to exchanges table`);
      return { synced: ppMatters.length, errors: 0 };
      
    } catch (error) {
      console.error('❌ Matter sync failed:', error.message);
      return { synced: 0, errors: 1 };
    }
  }

  /**
   * Sync PP users to users table
   */
  async syncUsers(since = null) {
    console.log('👥 Syncing PP users to users table...');
    
    try {
      const token = await this.tokenManager.getValidAccessToken();
      const params = { per_page: 1000 };
      if (since) params.updated_since = since;
      
      const response = await axios.get('https://app.practicepanther.com/api/v2/users', {
        headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' },
        params
      });
      
      const ppUsers = response.data || [];
      console.log(`Found ${ppUsers.length} PP users to sync`);
      
      if (ppUsers.length === 0) return { synced: 0, errors: 0 };
      
      // Update existing users with PP data (match by email)
      for (const ppUser of ppUsers) {
        if (!ppUser.email) continue;
        
        const { data: existing } = await this.supabase
          .from('users')
          .select('id')
          .ilike('email', ppUser.email)
          .single();
        
        if (existing) {
          // Update existing user with PP data
          await this.supabase
            .from('users')
            .update({
              pp_user_id: ppUser.id,
              pp_display_name: ppUser.display_name,
              pp_is_active: ppUser.is_active,
              first_name: ppUser.first_name || existing.first_name,
              last_name: ppUser.last_name || existing.last_name,
              pp_synced_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        }
      }
      
      console.log(`✅ Synced ${ppUsers.length} PP users to users table`);
      return { synced: ppUsers.length, errors: 0 };
      
    } catch (error) {
      console.error('❌ User sync failed:', error.message);
      return { synced: 0, errors: 1 };
    }
  }

  /**
   * Run full sync of all PP data
   */
  async runFullSync() {
    console.log('🔄 Starting unified PP sync to main tables...');
    const startTime = Date.now();
    
    const results = {
      matters: { synced: 0, errors: 0 },
      contacts: { synced: 0, errors: 0 },
      tasks: { synced: 0, errors: 0 },
      invoices: { synced: 0, errors: 0 },
      expenses: { synced: 0, errors: 0 },
      users: { synced: 0, errors: 0 }
    };
    
    // Get last sync timestamp
    const { data: lastSync } = await this.supabase
      .from('sync_logs')
      .select('completed_at')
      .eq('source', 'practicepanther')
      .eq('status', 'success')
      .order('completed_at', { ascending: false })
      .limit(1)
      .single();
    
    const since = lastSync?.completed_at || null;
    
    // Sync in order of dependencies
    results.matters = await this.syncMatters(since);
    results.contacts = await this.syncContacts(since);
    results.users = await this.syncUsers(since);
    results.tasks = await this.syncTasks(since);
    results.invoices = await this.syncInvoices(since);
    results.expenses = await this.syncExpenses(since);
    
    // Log sync completion
    const totalSynced = Object.values(results).reduce((sum, r) => sum + r.synced, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);
    
    await this.supabase
      .from('sync_logs')
      .insert({
        source: 'practicepanther',
        action: 'full_sync',
        status: totalErrors === 0 ? 'success' : 'partial',
        details: results,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        records_synced: totalSynced,
        errors_count: totalErrors
      });
    
    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(`✅ Unified sync completed in ${duration}s`);
    console.log(`📊 Results: ${totalSynced} synced, ${totalErrors} errors`);
    
    return results;
  }
}

module.exports = UnifiedPPSyncService;