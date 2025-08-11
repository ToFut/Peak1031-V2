/**
 * Complete PracticePanther Data Sync Script
 * Syncs all entities: matters, contacts, users, tasks, invoices, expenses
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class CompletePPSync {
  constructor() {
    this.accessToken = null;
    this.baseUrl = 'https://app.practicepanther.com/api/v1';
    this.stats = {
      users: 0,
      contacts: 0,
      exchanges: 0,
      tasks: 0,
      invoices: 0,
      expenses: 0,
      errors: 0
    };
  }

  async getAccessToken() {
    console.log('🔑 Getting PracticePanther access token...');
    
    try {
      const response = await axios.post('https://app.practicepanther.com/api/oauth2/token', {
        grant_type: 'client_credentials',
        client_id: process.env.PRACTICE_PANTHER_CLIENT_ID,
        client_secret: process.env.PRACTICE_PANTHER_CLIENT_SECRET
      });

      this.accessToken = response.data.access_token;
      console.log('✅ Access token obtained');
      return true;
    } catch (error) {
      console.error('❌ Failed to get access token:', error.response?.data || error.message);
      return false;
    }
  }

  async fetchFromPP(endpoint, limit = 1000) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        params: { limit }
      });

      return response.data;
    } catch (error) {
      console.error(`❌ Error fetching ${endpoint}:`, error.response?.data || error.message);
      this.stats.errors++;
      return null;
    }
  }

  async syncUsers() {
    console.log('👥 Syncing users...');
    
    const ppUsers = await this.fetchFromPP('/users', 100);
    if (!ppUsers?.data) return;

    for (const ppUser of ppUsers.data) {
      try {
        const userData = {
          email: ppUser.email || `user_${ppUser.id}@pp.com`,
          first_name: ppUser.first_name || '',
          last_name: ppUser.last_name || '',
          role: 'coordinator', // Default role
          is_active: ppUser.is_active !== false,
          pp_user_id: ppUser.id.toString(),
          pp_display_name: ppUser.display_name,
          pp_email: ppUser.email,
          pp_raw_data: ppUser,
          pp_synced_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('users')
          .upsert(userData, {
            onConflict: 'pp_user_id'
          });

        if (!error) {
          this.stats.users++;
        } else {
          console.error('User sync error:', error.message);
          this.stats.errors++;
        }
      } catch (error) {
        console.error('User processing error:', error.message);
        this.stats.errors++;
      }
    }

    console.log(`✅ Users synced: ${this.stats.users}`);
  }

  async syncContacts() {
    console.log('👨‍👩‍👧‍👦 Syncing contacts...');
    
    const ppContacts = await this.fetchFromPP('/contacts', 5000);
    if (!ppContacts?.data) return;

    for (const ppContact of ppContacts.data) {
      try {
        const contactData = {
          first_name: ppContact.first_name || '',
          last_name: ppContact.last_name || '',
          email: ppContact.email || null,
          phone: ppContact.phone || null,
          company: ppContact.company || null,
          contact_type: 'client',
          is_active: ppContact.is_active !== false,
          pp_contact_id: ppContact.id.toString(),
          pp_display_name: ppContact.display_name,
          pp_type: ppContact.type,
          pp_raw_data: ppContact,
          pp_synced_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('contacts')
          .upsert(contactData, {
            onConflict: 'pp_contact_id'
          });

        if (!error) {
          this.stats.contacts++;
        } else {
          console.error('Contact sync error:', error.message);
          this.stats.errors++;
        }
      } catch (error) {
        console.error('Contact processing error:', error.message);
        this.stats.errors++;
      }
    }

    console.log(`✅ Contacts synced: ${this.stats.contacts}`);
  }

  async syncExchanges() {
    console.log('🏢 Syncing exchanges (matters)...');
    
    const ppMatters = await this.fetchFromPP('/matters', 5000);
    if (!ppMatters?.data) return;

    for (const ppMatter of ppMatters.data) {
      try {
        // Find client contact
        let clientId = null;
        if (ppMatter.account_ref_id) {
          const { data: client } = await supabase
            .from('contacts')
            .select('id')
            .eq('pp_contact_id', ppMatter.account_ref_id.toString())
            .single();
          clientId = client?.id;
        }

        const exchangeData = {
          name: (ppMatter.name || ppMatter.display_name || 'Untitled Exchange').substring(0, 255),
          exchange_number: `EX-${ppMatter.number || ppMatter.id}`,
          description: ppMatter.notes?.substring(0, 1000) || null,
          status: this.mapStatus(ppMatter.status),
          client_id: clientId,
          exchange_value: ppMatter.custom_field_values?.exchange_value || 0,
          start_date: ppMatter.open_date ? new Date(ppMatter.open_date) : null,
          completion_date: ppMatter.close_date ? new Date(ppMatter.close_date) : null,
          pp_matter_id: ppMatter.id.toString(),
          pp_matter_number: ppMatter.number,
          pp_matter_status: ppMatter.status,
          pp_display_name: ppMatter.display_name,
          pp_name: ppMatter.name,
          pp_notes: ppMatter.notes,
          pp_raw_data: ppMatter,
          pp_synced_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('exchanges')
          .upsert(exchangeData, {
            onConflict: 'pp_matter_id'
          });

        if (!error) {
          this.stats.exchanges++;
        } else {
          console.error('Exchange sync error:', error.message);
          this.stats.errors++;
        }
      } catch (error) {
        console.error('Exchange processing error:', error.message);
        this.stats.errors++;
      }
    }

    console.log(`✅ Exchanges synced: ${this.stats.exchanges}`);
  }

  async syncTasks() {
    console.log('📋 Syncing tasks...');
    
    const ppTasks = await this.fetchFromPP('/tasks', 2000);
    if (!ppTasks?.data) return;

    for (const ppTask of ppTasks.data) {
      try {
        // Find related exchange
        let exchangeId = null;
        if (ppTask.matter_id) {
          const { data: exchange } = await supabase
            .from('exchanges')
            .select('id')
            .eq('pp_matter_id', ppTask.matter_id.toString())
            .single();
          exchangeId = exchange?.id;
        }

        const taskData = {
          title: ppTask.name || ppTask.description || 'Untitled Task',
          description: ppTask.description,
          status: ppTask.is_completed ? 'completed' : 'pending',
          due_date: ppTask.due_date ? new Date(ppTask.due_date) : null,
          exchange_id: exchangeId,
          pp_task_id: ppTask.id.toString(),
          pp_raw_data: ppTask,
          pp_synced_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('tasks')
          .upsert(taskData, {
            onConflict: 'pp_task_id'
          });

        if (!error) {
          this.stats.tasks++;
        } else {
          console.error('Task sync error:', error.message);
          this.stats.errors++;
        }
      } catch (error) {
        console.error('Task processing error:', error.message);
        this.stats.errors++;
      }
    }

    console.log(`✅ Tasks synced: ${this.stats.tasks}`);
  }

  async syncInvoices() {
    console.log('💰 Syncing invoices...');
    
    const ppInvoices = await this.fetchFromPP('/invoices', 5000);
    if (!ppInvoices?.data) return;

    for (const ppInvoice of ppInvoices.data) {
      try {
        const invoiceData = {
          invoice_number: ppInvoice.number || `INV-${ppInvoice.id}`,
          amount: parseFloat(ppInvoice.amount || 0),
          total_amount: parseFloat(ppInvoice.total_amount || ppInvoice.amount || 0),
          status: ppInvoice.status || 'draft',
          due_date: ppInvoice.due_date ? new Date(ppInvoice.due_date) : null,
          description: ppInvoice.description,
          pp_invoice_id: ppInvoice.id.toString(),
          pp_raw_data: ppInvoice,
          pp_synced_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('invoices')
          .upsert(invoiceData, {
            onConflict: 'pp_invoice_id'
          });

        if (!error) {
          this.stats.invoices++;
        } else {
          console.error('Invoice sync error:', error.message);
          this.stats.errors++;
        }
      } catch (error) {
        console.error('Invoice processing error:', error.message);
        this.stats.errors++;
      }
    }

    console.log(`✅ Invoices synced: ${this.stats.invoices}`);
  }

  async syncExpenses() {
    console.log('💳 Syncing expenses...');
    
    const ppExpenses = await this.fetchFromPP('/expenses', 1000);
    if (!ppExpenses?.data) return;

    for (const ppExpense of ppExpenses.data) {
      try {
        const expenseData = {
          amount: parseFloat(ppExpense.amount || 0),
          description: ppExpense.description || ppExpense.memo,
          expense_date: ppExpense.date ? new Date(ppExpense.date) : null,
          vendor: ppExpense.vendor,
          category: ppExpense.category,
          is_billable: ppExpense.is_billable !== false,
          pp_expense_id: ppExpense.id.toString(),
          pp_raw_data: ppExpense,
          pp_synced_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('expenses')
          .upsert(expenseData, {
            onConflict: 'pp_expense_id'
          });

        if (!error) {
          this.stats.expenses++;
        } else {
          console.error('Expense sync error:', error.message);
          this.stats.errors++;
        }
      } catch (error) {
        console.error('Expense processing error:', error.message);
        this.stats.errors++;
      }
    }

    console.log(`✅ Expenses synced: ${this.stats.expenses}`);
  }

  mapStatus(ppStatus) {
    const statusMap = {
      'open': 'active',
      'closed': 'completed',
      'pending': 'pending',
      'active': 'active',
      'completed': 'completed'
    };
    return statusMap[ppStatus?.toLowerCase()] || 'pending';
  }

  async run() {
    console.log('🚀 Starting Complete PracticePanther Sync');
    console.log('=========================================');
    
    const startTime = Date.now();

    // Get access token
    if (!await this.getAccessToken()) {
      console.error('❌ Cannot proceed without access token');
      process.exit(1);
    }

    // Run all sync operations
    const operations = [
      () => this.syncUsers(),
      () => this.syncContacts(),
      () => this.syncExchanges(),
      () => this.syncTasks(),
      () => this.syncInvoices(),
      () => this.syncExpenses()
    ];

    for (const operation of operations) {
      await operation();
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n🎉 SYNC COMPLETE!');
    console.log('================');
    console.log(`⏱️  Total time: ${duration} seconds`);
    console.log('\n📊 SYNC STATISTICS:');
    console.log(`   • Users: ${this.stats.users}`);
    console.log(`   • Contacts: ${this.stats.contacts}`);
    console.log(`   • Exchanges: ${this.stats.exchanges}`);
    console.log(`   • Tasks: ${this.stats.tasks}`);
    console.log(`   • Invoices: ${this.stats.invoices}`);
    console.log(`   • Expenses: ${this.stats.expenses}`);
    console.log(`   • Errors: ${this.stats.errors}`);
    
    const total = Object.values(this.stats).reduce((sum, val) => sum + val, 0) - this.stats.errors;
    console.log(`   • Total Records: ${total}`);
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new CompletePPSync();
  sync.run().catch(console.error);
}

module.exports = CompletePPSync;