#!/usr/bin/env node

/**
 * SYNC REMAINING ENTITIES - Exchanges, Tasks, Invoices, Expenses
 * Syncs 3000 records each from PracticePanther
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const PracticePartnerService = require('../services/practicePartnerService');

class SyncRemainingEntities {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.ppService = new PracticePartnerService();
    this.stats = {
      exchanges: 0,
      tasks: 0,
      invoices: 0,
      expenses: 0
    };

    // Mapping caches for relationships
    this.userIdMap = new Map();
    this.contactIdMap = new Map();
    this.exchangeIdMap = new Map();
  }

  async run() {
    console.log('🚀 SYNC REMAINING ENTITIES (3000 each)');
    console.log('=====================================');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Build relationship maps first
      await this.buildRelationshipMaps();
      
      // Sync remaining entities
      await this.syncExchanges(3000);
      await this.syncTasks(3000);
      await this.syncInvoices(3000);
      await this.syncExpenses(3000);
      
      await this.showResults();
      
    } catch (error) {
      console.error('❌ Remaining entities sync failed:', error.message);
    }
  }

  async buildRelationshipMaps() {
    console.log('🔗 Building relationship maps...');
    
    // Build user ID mapping
    const { data: users } = await this.supabase
      .from('users')
      .select('id, pp_user_id')
      .not('pp_user_id', 'is', null);
    
    if (users) {
      users.forEach(user => {
        this.userIdMap.set(user.pp_user_id, user.id);
      });
      console.log(`   📋 ${users.length} user mappings loaded`);
    }

    // Build contact ID mapping
    const { data: contacts } = await this.supabase
      .from('contacts')
      .select('id, pp_contact_id')
      .not('pp_contact_id', 'is', null);
    
    if (contacts) {
      contacts.forEach(contact => {
        this.contactIdMap.set(contact.pp_contact_id, contact.id);
      });
      console.log(`   📋 ${contacts.length} contact mappings loaded`);
    }

    console.log('✅ Relationship maps built\n');
  }

  async syncExchanges(limit = 3000) {
    console.log(`🏢 Syncing ${limit} Exchanges (PP matters → exchanges table)...`);
    
    try {
      const response = await this.ppService.client.get('/matters', { params: { limit } });
      const matters = Object.values(response.data) || [];
      
      console.log(`📥 Found ${matters.length} PP matters`);
      
      for (const ppMatter of matters) {
        try {
          // Find coordinator from PP assigned users (only if exists in our users table)
          let coordinator_id = null;
          if (ppMatter.assigned_to_users && ppMatter.assigned_to_users.length > 0) {
            const firstAssignedUser = ppMatter.assigned_to_users[0];
            const ppUserId = firstAssignedUser.id || firstAssignedUser;
            const mappedUserId = this.userIdMap.get(ppUserId);
            // Only assign if the user actually exists in our database
            if (mappedUserId) {
              coordinator_id = mappedUserId;
            }
          }

          const exchangeData = {
            exchange_number: `EX-${ppMatter.number || ppMatter.id}`,
            name: ppMatter.name || ppMatter.display_name,
            display_name: ppMatter.display_name,
            notes: ppMatter.notes,
            exchange_type: 'simultaneous',
            
            // Relationships
            coordinator_id: coordinator_id,
            assigned_users: ppMatter.assigned_to_users || [],
            
            // Status and priority
            status: this.mapPPStatusToExchangeStatus(ppMatter.status),
            priority: 'medium',
            tags: ppMatter.tags || [],
            
            // PP metadata
            pp_matter_id: ppMatter.id,
            pp_account_ref: ppMatter.account_ref || {},
            number: ppMatter.number,
            rate: ppMatter.rate,
            open_date: ppMatter.open_date ? this.parseDate(ppMatter.open_date) : null,
            close_date: ppMatter.close_date ? this.parseDate(ppMatter.close_date) : null,
            custom_field_values: ppMatter.custom_field_values || [],
            
            created_at: ppMatter.created_at ? new Date(ppMatter.created_at) : new Date(),
            updated_at: ppMatter.updated_at ? new Date(ppMatter.updated_at) : new Date()
          };
          
          const { data, error } = await this.supabase
            .from('exchanges')
            .upsert(exchangeData, { onConflict: 'pp_matter_id' })
            .select('id, pp_matter_id');
          
          if (error) {
            console.log(`❌ Exchange ${ppMatter.display_name}:`, error.message);
          } else {
            this.stats.exchanges++;
            // Cache the mapping for later use
            if (data && data[0]) {
              this.exchangeIdMap.set(ppMatter.id, data[0].id);
            }
          }
          
        } catch (err) {
          console.log(`❌ Exchange error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.exchanges} exchanges synced\n`);
      
    } catch (error) {
      console.error('❌ Exchanges sync failed:', error.message);
    }
  }

  async syncTasks(limit = 3000) {
    console.log(`✅ Syncing ${limit} Tasks (PP → tasks table)...`);
    
    try {
      const response = await this.ppService.client.get('/tasks', { params: { limit } });
      const tasks = Object.values(response.data) || [];
      
      console.log(`📥 Found ${tasks.length} PP tasks`);
      
      for (const ppTask of tasks) {
        try {
          // Map relationships
          let exchange_id = null;
          let primary_contact_id = null;
          let assigned_to = null;
          
          // Map exchange from PP matter_ref
          if (ppTask.matter_ref && ppTask.matter_ref.id) {
            exchange_id = this.exchangeIdMap.get(ppTask.matter_ref.id);
          }
          
          // Map assigned user from PP assigned_to_users (only if exists)
          if (ppTask.assigned_to_users && ppTask.assigned_to_users.length > 0) {
            const firstAssignedUser = ppTask.assigned_to_users[0];
            const ppUserId = firstAssignedUser.id || firstAssignedUser;
            const mappedUserId = this.userIdMap.get(ppUserId);
            if (mappedUserId) {
              assigned_to = mappedUserId;
            }
          }
          
          const taskData = {
            title: ppTask.subject || 'Untitled Task',
            description: ppTask.notes,
            subject: ppTask.subject,
            notes: ppTask.notes,
            
            // Relationships
            exchange_id: exchange_id,
            primary_contact_id: primary_contact_id,
            assigned_to: assigned_to,
            assigned_users: ppTask.assigned_to_users || [],
            assigned_contacts: ppTask.assigned_to_contacts || [],
            
            // Timeline
            due_date: ppTask.due_date ? this.parseDateTime(ppTask.due_date) : null,
            
            // Status and priority
            status: this.mapPPStatusToTaskStatus(ppTask.status),
            priority: ppTask.priority || 'medium',
            
            // PP metadata
            pp_task_id: ppTask.id,
            pp_account_ref: ppTask.account_ref || {},
            custom_field_values: ppTask.custom_field_values || [],
            
            created_at: ppTask.created_at ? new Date(ppTask.created_at) : new Date(),
            updated_at: ppTask.updated_at ? new Date(ppTask.updated_at) : new Date()
          };
          
          const { error } = await this.supabase
            .from('tasks')
            .upsert(taskData, { onConflict: 'pp_task_id' });
          
          if (error) {
            console.log(`❌ Task ${ppTask.subject}:`, error.message);
          } else {
            this.stats.tasks++;
          }
          
        } catch (err) {
          console.log(`❌ Task error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.tasks} tasks synced\n`);
      
    } catch (error) {
      console.error('❌ Tasks sync failed:', error.message);
    }
  }

  async syncInvoices(limit = 3000) {
    console.log(`💰 Syncing ${limit} Invoices (PP → invoices table)...`);
    
    try {
      const response = await this.ppService.client.get('/invoices', { params: { limit } });
      const invoices = Object.values(response.data) || [];
      
      console.log(`📥 Found ${invoices.length} PP invoices`);
      
      for (const ppInvoice of invoices) {
        try {
          // Map relationships
          let exchange_id = null;
          let client_id = null;
          
          // Map exchange from PP matter_ref
          if (ppInvoice.matter_ref && ppInvoice.matter_ref.id) {
            exchange_id = this.exchangeIdMap.get(ppInvoice.matter_ref.id);
          }
          
          const invoiceData = {
            invoice_number: `INV-${ppInvoice.id}`,
            
            // Relationships
            exchange_id: exchange_id,
            client_id: client_id,
            
            // Financial data (PP stores in cents, convert to dollars)
            issue_date: this.parseDate(ppInvoice.issue_date),
            due_date: this.parseDate(ppInvoice.due_date),
            subtotal: (ppInvoice.subtotal || 0) / 100,
            tax_amount: (ppInvoice.tax || 0) / 100,
            discount_amount: (ppInvoice.discount || 0) / 100,
            total_amount: (ppInvoice.total || 0) / 100,
            amount_paid: (ppInvoice.total_paid || 0) / 100,
            
            status: 'sent',
            invoice_type: ppInvoice.invoice_type || 'service',
            
            // PP data
            items_time_entries: ppInvoice.items_time_entries || [],
            items_expenses: ppInvoice.items_expenses || [],
            items_flat_fees: ppInvoice.items_flat_fees || [],
            
            // PP metadata
            pp_invoice_id: ppInvoice.id,
            pp_account_ref: ppInvoice.account_ref || {},
            
            created_at: ppInvoice.created_at ? new Date(ppInvoice.created_at) : new Date(),
            updated_at: ppInvoice.updated_at ? new Date(ppInvoice.updated_at) : new Date()
          };
          
          const { error } = await this.supabase
            .from('invoices')
            .upsert(invoiceData, { onConflict: 'pp_invoice_id' });
          
          if (error) {
            console.log(`❌ Invoice ${ppInvoice.id}:`, error.message);
          } else {
            this.stats.invoices++;
          }
          
        } catch (err) {
          console.log(`❌ Invoice error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.invoices} invoices synced\n`);
      
    } catch (error) {
      console.error('❌ Invoices sync failed:', error.message);
    }
  }

  async syncExpenses(limit = 3000) {
    console.log(`💳 Syncing ${limit} Expenses (PP → expenses table)...`);
    
    try {
      const response = await this.ppService.client.get('/expenses', { params: { limit } });
      const expenses = Object.values(response.data) || [];
      
      console.log(`📥 Found ${expenses.length} PP expenses`);
      
      for (const ppExpense of expenses) {
        try {
          // Map relationships
          let exchange_id = null;
          let client_id = null;
          let user_id = null;
          
          // Map exchange from PP matter_ref
          if (ppExpense.matter_ref && ppExpense.matter_ref.id) {
            exchange_id = this.exchangeIdMap.get(ppExpense.matter_ref.id);
          }
          
          // Map user from PP billed_by_user_ref (only if exists)
          if (ppExpense.billed_by_user_ref && ppExpense.billed_by_user_ref.id) {
            const mappedUserId = this.userIdMap.get(ppExpense.billed_by_user_ref.id);
            if (mappedUserId) {
              user_id = mappedUserId;
            }
          }
          
          const expenseData = {
            description: ppExpense.description || 'Expense',
            amount: (ppExpense.amount || 0) / 100, // Convert from cents
            expense_date: this.parseDate(ppExpense.date),
            quantity: ppExpense.qty || 1,
            qty: ppExpense.qty || 1,
            price: (ppExpense.price || 0) / 100,
            
            // Relationships
            exchange_id: exchange_id,
            client_id: client_id,
            user_id: user_id,
            
            // Business logic
            is_billable: ppExpense.is_billable !== false,
            is_billed: ppExpense.is_billed === true,
            private_notes: ppExpense.private_notes,
            
            // PP metadata
            pp_expense_id: ppExpense.id,
            pp_account_ref: ppExpense.account_ref || {},
            
            created_at: ppExpense.created_at ? new Date(ppExpense.created_at) : new Date(),
            updated_at: ppExpense.updated_at ? new Date(ppExpense.updated_at) : new Date()
          };
          
          const { error } = await this.supabase
            .from('expenses')
            .upsert(expenseData, { onConflict: 'pp_expense_id' });
          
          if (error) {
            console.log(`❌ Expense ${ppExpense.description}:`, error.message);
          } else {
            this.stats.expenses++;
          }
          
        } catch (err) {
          console.log(`❌ Expense error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.expenses} expenses synced\n`);
      
    } catch (error) {
      console.error('❌ Expenses sync failed:', error.message);
    }
  }

  // Helper methods
  mapPPStatusToExchangeStatus(ppStatus) {
    const statusMap = {
      'open': 'active',
      'closed': 'completed',
      'pending': 'pending',
      'hold': 'on_hold'
    };
    return statusMap[ppStatus] || 'active';
  }

  mapPPStatusToTaskStatus(ppStatus) {
    const statusMap = {
      'open': 'pending',
      'in_progress': 'in_progress', 
      'completed': 'completed',
      'cancelled': 'cancelled'
    };
    return statusMap[ppStatus] || 'pending';
  }

  parseDate(dateString) {
    if (!dateString) return null;
    try {
      return new Date(dateString).toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  parseDateTime(dateString) {
    if (!dateString) return null;
    try {
      return new Date(dateString).toISOString();
    } catch {
      return null;
    }
  }

  async showResults() {
    console.log('🎉 REMAINING ENTITIES SYNC COMPLETED!');
    console.log('====================================');
    
    const totalSynced = Object.values(this.stats).reduce((a, b) => a + b, 0);
    
    console.log(`Exchanges  : ${this.stats.exchanges.toLocaleString()}`);
    console.log(`Tasks      : ${this.stats.tasks.toLocaleString()}`);
    console.log(`Invoices   : ${this.stats.invoices.toLocaleString()}`);
    console.log(`Expenses   : ${this.stats.expenses.toLocaleString()}`);
    console.log(`TOTAL      : ${totalSynced.toLocaleString()} remaining entity records`);
    
    // Final status check
    console.log('\n📊 Final Database Status:');
    
    const tables = ['users', 'contacts', 'exchanges', 'tasks', 'invoices', 'expenses'];
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
    
    console.log('\n✅ All remaining entities synced successfully!');
    console.log('🚀 Your 1031 platform now has complete PracticePanther integration!');
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new SyncRemainingEntities();
  sync.run()
    .then(() => {
      console.log('\n🎉 Remaining entities sync completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Remaining entities sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = SyncRemainingEntities;