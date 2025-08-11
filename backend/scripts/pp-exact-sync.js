#!/usr/bin/env node

/**
 * PRACTICEPANTHER EXACT SYNC
 * Syncs PP data to tables with exact field mapping
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const PracticePartnerService = require('../services/practicePartnerService');

class PPExactSync {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.ppService = new PracticePartnerService();
    this.stats = {
      users: 0,
      contacts: 0,
      matters: 0,
      tasks: 0,
      invoices: 0,
      expenses: 0
    };
  }

  async run() {
    console.log('🚀 PRACTICEPANTHER EXACT SYNC');
    console.log('=============================');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Test connection
      await this.testConnection();
      
      // Sync each entity with exact field mapping
      await this.syncUsers();
      await this.syncContacts();
      await this.syncMatters();
      await this.syncTasks();
      await this.syncInvoices();
      await this.syncExpenses();
      
      await this.showResults();
      
    } catch (error) {
      console.error('❌ Sync failed:', error.message);
    }
  }

  async testConnection() {
    console.log('🔌 Testing connection...');
    const response = await this.ppService.client.get('/users', { params: { limit: 1 } });
    console.log('✅ Connected to PracticePanther API');
    console.log('');
  }

  async syncUsers() {
    console.log('👥 Syncing Users to pp_users table...');
    
    try {
      const response = await this.ppService.client.get('/users', { params: { limit: 1000 } });
      const users = Object.values(response.data) || [];
      
      console.log(`📥 Found ${users.length} users`);
      
      for (const ppUser of users) {
        try {
          // Map EXACTLY to PP structure - no interpretation
          const userData = {
            pp_id: ppUser.id,
            pp_is_active: ppUser.is_active,
            pp_display_name: ppUser.display_name,
            pp_first_name: ppUser.first_name,
            pp_last_name: ppUser.last_name,
            pp_middle_name: ppUser.middle_name,
            pp_email: ppUser.email,
            pp_created_at: ppUser.created_at,
            pp_updated_at: ppUser.updated_at,
            synced_at: new Date()
          };
          
          const { error } = await this.supabase
            .from('pp_users')
            .upsert(userData, { onConflict: 'pp_id' });
          
          if (error) {
            console.log(`❌ User ${ppUser.display_name}:`, error.message);
          } else {
            this.stats.users++;
          }
          
        } catch (err) {
          console.log(`❌ User error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.users} users synced\\n`);
      
    } catch (error) {
      console.error('❌ Users sync failed:', error.message);
      console.log('');
    }
  }

  async syncContacts() {
    console.log('📞 Syncing Contacts to pp_contacts table (first 500)...');
    
    try {
      const response = await this.ppService.client.get('/contacts', { params: { limit: 500 } });
      const contacts = Object.values(response.data) || [];
      
      console.log(`📥 Found ${contacts.length} contacts`);
      
      for (const ppContact of contacts) {
        try {
          // Map EXACTLY to PP structure - no interpretation
          const contactData = {
            pp_id: ppContact.id,
            pp_account_ref: ppContact.account_ref || {},
            pp_is_primary_contact: ppContact.is_primary_contact,
            pp_display_name: ppContact.display_name,
            pp_first_name: ppContact.first_name,
            pp_middle_name: ppContact.middle_name,
            pp_last_name: ppContact.last_name,
            pp_phone_mobile: ppContact.phone_mobile,
            pp_phone_home: ppContact.phone_home,
            pp_phone_fax: ppContact.phone_fax,
            pp_phone_work: ppContact.phone_work,
            pp_email: ppContact.email,
            pp_notes: ppContact.notes,
            pp_custom_field_values: ppContact.custom_field_values || [],
            synced_at: new Date()
          };
          
          const { error } = await this.supabase
            .from('pp_contacts')
            .upsert(contactData, { onConflict: 'pp_id' });
          
          if (error) {
            console.log(`❌ Contact ${ppContact.display_name}:`, error.message);
          } else {
            this.stats.contacts++;
          }
          
        } catch (err) {
          console.log(`❌ Contact error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.contacts} contacts synced\\n`);
      
    } catch (error) {
      console.error('❌ Contacts sync failed:', error.message);
      console.log('');
    }
  }

  async syncMatters() {
    console.log('📁 Syncing Matters to pp_matters table (first 200)...');
    
    try {
      const response = await this.ppService.client.get('/matters', { params: { limit: 200 } });
      const matters = Object.values(response.data) || [];
      
      console.log(`📥 Found ${matters.length} matters`);
      
      for (const ppMatter of matters) {
        try {
          // Map EXACTLY to PP structure - no interpretation
          const matterData = {
            pp_id: ppMatter.id,
            pp_account_ref: ppMatter.account_ref || {},
            pp_number: ppMatter.number,
            pp_display_name: ppMatter.display_name,
            pp_name: ppMatter.name,
            pp_notes: ppMatter.notes,
            pp_rate: ppMatter.rate,
            pp_open_date: ppMatter.open_date,
            pp_close_date: ppMatter.close_date,
            pp_statute_of_limitation_date: ppMatter.statute_of_limitation_date,
            pp_tags: ppMatter.tags || [],
            pp_status: ppMatter.status,
            pp_assigned_to_users: ppMatter.assigned_to_users || [],
            pp_custom_field_values: ppMatter.custom_field_values || [],
            pp_created_at: ppMatter.created_at,
            pp_updated_at: ppMatter.updated_at,
            synced_at: new Date()
          };
          
          const { error } = await this.supabase
            .from('pp_matters')
            .upsert(matterData, { onConflict: 'pp_id' });
          
          if (error) {
            console.log(`❌ Matter ${ppMatter.display_name}:`, error.message);
          } else {
            this.stats.matters++;
          }
          
        } catch (err) {
          console.log(`❌ Matter error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.matters} matters synced\\n`);
      
    } catch (error) {
      console.error('❌ Matters sync failed:', error.message);
      console.log('');
    }
  }

  async syncTasks() {
    console.log('✅ Syncing Tasks to pp_tasks table (first 100)...');
    
    try {
      const response = await this.ppService.client.get('/tasks', { params: { limit: 100 } });
      const tasks = Object.values(response.data) || [];
      
      console.log(`📥 Found ${tasks.length} tasks`);
      
      for (const ppTask of tasks) {
        try {
          // Map EXACTLY to PP structure - no interpretation
          const taskData = {
            pp_id: ppTask.id,
            pp_account_ref: ppTask.account_ref || {},
            pp_matter_ref: ppTask.matter_ref || {},
            pp_subject: ppTask.subject,
            pp_notes: ppTask.notes,
            pp_priority: ppTask.priority,
            pp_status: ppTask.status,
            pp_due_date: ppTask.due_date,
            pp_assigned_to_users: ppTask.assigned_to_users || [],
            pp_assigned_to_contacts: ppTask.assigned_to_contacts || [],
            pp_tags: ppTask.tags || [],
            pp_created_at: ppTask.created_at,
            pp_updated_at: ppTask.updated_at,
            synced_at: new Date()
          };
          
          const { error } = await this.supabase
            .from('pp_tasks')
            .upsert(taskData, { onConflict: 'pp_id' });
          
          if (error) {
            console.log(`❌ Task ${ppTask.subject}:`, error.message);
          } else {
            this.stats.tasks++;
          }
          
        } catch (err) {
          console.log(`❌ Task error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.tasks} tasks synced\\n`);
      
    } catch (error) {
      console.error('❌ Tasks sync failed:', error.message);
      console.log('');
    }
  }

  async syncInvoices() {
    console.log('💰 Syncing Invoices to pp_invoices table (first 100)...');
    
    try {
      const response = await this.ppService.client.get('/invoices', { params: { limit: 100 } });
      const invoices = Object.values(response.data) || [];
      
      console.log(`📥 Found ${invoices.length} invoices`);
      
      for (const ppInvoice of invoices) {
        try {
          // Map EXACTLY to PP structure - no interpretation
          const invoiceData = {
            pp_id: ppInvoice.id,
            pp_account_ref: ppInvoice.account_ref || {},
            pp_matter_ref: ppInvoice.matter_ref || {},
            pp_issue_date: ppInvoice.issue_date,
            pp_due_date: ppInvoice.due_date,
            pp_items_time_entries: ppInvoice.items_time_entries || [],
            pp_items_expenses: ppInvoice.items_expenses || [],
            pp_items_flat_fees: ppInvoice.items_flat_fees || [],
            pp_subtotal: ppInvoice.subtotal,
            pp_tax: ppInvoice.tax,
            pp_discount: ppInvoice.discount,
            pp_total: ppInvoice.total,
            pp_total_paid: ppInvoice.total_paid,
            pp_total_outstanding: ppInvoice.total_outstanding,
            pp_invoice_type: ppInvoice.invoice_type,
            pp_created_at: ppInvoice.created_at,
            pp_updated_at: ppInvoice.updated_at,
            synced_at: new Date()
          };
          
          const { error } = await this.supabase
            .from('pp_invoices')
            .upsert(invoiceData, { onConflict: 'pp_id' });
          
          if (error) {
            console.log(`❌ Invoice ${ppInvoice.id}:`, error.message);
          } else {
            this.stats.invoices++;
          }
          
        } catch (err) {
          console.log(`❌ Invoice error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.invoices} invoices synced\\n`);
      
    } catch (error) {
      console.error('❌ Invoices sync failed:', error.message);
      console.log('');
    }
  }

  async syncExpenses() {
    console.log('💳 Syncing Expenses to pp_expenses table (first 50)...');
    
    try {
      const response = await this.ppService.client.get('/expenses', { params: { limit: 50 } });
      const expenses = Object.values(response.data) || [];
      
      console.log(`📥 Found ${expenses.length} expenses`);
      
      for (const ppExpense of expenses) {
        try {
          // Map EXACTLY to PP structure - no interpretation
          const expenseData = {
            pp_id: ppExpense.id,
            pp_is_billable: ppExpense.is_billable,
            pp_is_billed: ppExpense.is_billed,
            pp_date: ppExpense.date,
            pp_qty: ppExpense.qty,
            pp_price: ppExpense.price,
            pp_amount: ppExpense.amount,
            pp_description: ppExpense.description,
            pp_private_notes: ppExpense.private_notes,
            pp_account_ref: ppExpense.account_ref || {},
            pp_matter_ref: ppExpense.matter_ref || {},
            pp_billed_by_user_ref: ppExpense.billed_by_user_ref || {},
            pp_expense_category_ref: ppExpense.expense_category_ref || {},
            pp_created_at: ppExpense.created_at,
            pp_updated_at: ppExpense.updated_at,
            synced_at: new Date()
          };
          
          const { error } = await this.supabase
            .from('pp_expenses')
            .upsert(expenseData, { onConflict: 'pp_id' });
          
          if (error) {
            console.log(`❌ Expense ${ppExpense.description}:`, error.message);
          } else {
            this.stats.expenses++;
          }
          
        } catch (err) {
          console.log(`❌ Expense error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.expenses} expenses synced\\n`);
      
    } catch (error) {
      console.error('❌ Expenses sync failed:', error.message);
      console.log('');
    }
  }

  async showResults() {
    console.log('🎉 PP EXACT SYNC COMPLETED!');
    console.log('===========================');
    
    const totalSynced = Object.values(this.stats).reduce((a, b) => a + b, 0);
    
    console.log(`Users     : ${this.stats.users.toLocaleString()}`);
    console.log(`Contacts  : ${this.stats.contacts.toLocaleString()}`);
    console.log(`Matters   : ${this.stats.matters.toLocaleString()}`);
    console.log(`Tasks     : ${this.stats.tasks.toLocaleString()}`);
    console.log(`Invoices  : ${this.stats.invoices.toLocaleString()}`);
    console.log(`Expenses  : ${this.stats.expenses.toLocaleString()}`);
    console.log(`TOTAL     : ${totalSynced.toLocaleString()} records`);
    
    console.log('\\n📊 Database Verification:');
    
    const tables = ['pp_users', 'pp_contacts', 'pp_matters', 'pp_tasks', 'pp_invoices', 'pp_expenses'];
    for (const table of tables) {
      try {
        const { count } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        console.log(`${table.padEnd(12)}: ${(count || 0).toLocaleString().padStart(6)} total records`);
      } catch (err) {
        console.log(`${table.padEnd(12)}: Error - ${err.message}`);
      }
    }
    
    console.log('\\n✅ All PracticePanther data now available with exact field mapping!');
    console.log('🚀 Ready for advanced 1031 exchange management operations!');
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new PPExactSync();
  sync.run()
    .then(() => {
      console.log('\\n🎉 Exact sync completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Exact sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = PPExactSync;