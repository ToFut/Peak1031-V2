#!/usr/bin/env node

/**
 * BUSINESS ENTITY SYNC - PP to 1031 Platform
 * Syncs PracticePanther data to proper business entity tables with relationships
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const PracticePartnerService = require('../services/practicePartnerService');

class BusinessEntitySync {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.ppService = new PracticePartnerService();
    this.stats = {
      users: 0,
      contacts: 0,
      exchanges: 0,
      tasks: 0,
      invoices: 0,
      expenses: 0
    };

    // Mapping caches for relationships
    this.userIdMap = new Map(); // pp_user_id -> uuid
    this.contactIdMap = new Map(); // pp_contact_id -> uuid
    this.exchangeIdMap = new Map(); // pp_matter_id -> uuid
  }

  async run() {
    console.log('🚀 BUSINESS ENTITY SYNC (PP → 1031 Platform)');
    console.log('===============================================');
    console.log(`Started: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Test connection
      await this.testConnection();
      
      // Sync in dependency order (referenced tables first)
      await this.syncUsers();
      await this.syncContacts(); // Needs exchanges reference, but we'll handle circular refs
      await this.syncExchanges(); // References users and contacts
      await this.updateContactExchangeReferences(); // Update contacts with exchange refs
      await this.syncTasks(); // References exchanges, users, contacts
      await this.syncInvoices(); // References exchanges, contacts, users
      await this.syncExpenses(); // References exchanges, contacts, users
      
      await this.showResults();
      
    } catch (error) {
      console.error('❌ Business entity sync failed:', error.message);
    }
  }

  async testConnection() {
    console.log('🔌 Testing connections...');
    const response = await this.ppService.client.get('/users', { params: { limit: 1 } });
    console.log('✅ Connected to PracticePanther API');
    
    // Test Supabase connection
    const { error } = await this.supabase.from('users').select('id').limit(1);
    if (error && !error.message.includes('JSON object requested')) {
      throw error;
    }
    console.log('✅ Connected to Supabase database');
    console.log('');
  }

  async syncUsers() {
    console.log('👥 Syncing Users (PP → users table)...');
    
    try {
      const response = await this.ppService.client.get('/users', { params: { limit: 1000 } });
      const users = Object.values(response.data) || [];
      
      console.log(`📥 Found ${users.length} PP users`);
      
      for (const ppUser of users) {
        try {
          // Map PP user to business entity structure (using actual PP field names)
          const userData = {
            email: ppUser.email || `pp_user_${ppUser.id}@placeholder.com`,
            first_name: ppUser.first_name || 'Unknown',
            last_name: ppUser.last_name || 'User',
            middle_name: ppUser.middle_name,
            display_name: ppUser.display_name,
            role: 'coordinator', // Default role, can be updated later
            is_active: ppUser.is_active !== false,
            
            // Store PP metadata
            pp_user_id: ppUser.id, // Keep this for relationship mapping
            created_at: ppUser.created_at ? new Date(ppUser.created_at) : new Date(),
            updated_at: ppUser.updated_at ? new Date(ppUser.updated_at) : new Date()
          };
          
          const { data, error } = await this.supabase
            .from('users')
            .upsert(userData, { onConflict: 'pp_user_id' })
            .select('id, pp_user_id');
          
          if (error) {
            console.log(`❌ User ${ppUser.display_name}:`, error.message);
          } else {
            this.stats.users++;
            // Cache the mapping for later use
            if (data && data[0]) {
              this.userIdMap.set(ppUser.id, data[0].id);
            }
          }
          
        } catch (err) {
          console.log(`❌ User error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.users} users synced to business entity table\n`);
      
    } catch (error) {
      console.error('❌ Users sync failed:', error.message);
      console.log('');
    }
  }

  async syncContacts() {
    console.log('📞 Syncing Contacts (PP → contacts table)...');
    
    try {
      const response = await this.ppService.client.get('/contacts', { params: { limit: 500 } });
      const contacts = Object.values(response.data) || [];
      
      console.log(`📥 Found ${contacts.length} PP contacts`);
      
      for (const ppContact of contacts) {
        try {
          // Map PP contact to business entity structure (using actual PP field names)
          const contactData = {
            first_name: ppContact.first_name,
            last_name: ppContact.last_name,
            middle_name: ppContact.middle_name,
            display_name: ppContact.display_name,
            email: ppContact.email,
            
            // Contact information (using _new columns to handle size constraints)
            phone_primary_new: ppContact.phone_mobile || ppContact.phone_work || ppContact.phone_home,
            phone_mobile_new: ppContact.phone_mobile,
            phone_work_new: ppContact.phone_work,
            phone_home_new: ppContact.phone_home,
            phone_fax_new: ppContact.phone_fax,
            
            // Business context
            contact_type: ['client'], // Default, can be refined later
            is_primary_contact: ppContact.is_primary_contact,
            notes: ppContact.notes,
            
            // PP metadata for relationship mapping
            pp_contact_id: ppContact.id,
            pp_account_ref: ppContact.account_ref || {},
            custom_field_values: ppContact.custom_field_values || [],
            
            // Note: primary_exchange_id will be set later when we have exchange mapping
            created_at: new Date(),
            updated_at: new Date()
          };
          
          const { data, error } = await this.supabase
            .from('contacts')
            .upsert(contactData, { onConflict: 'pp_contact_id' })
            .select('id, pp_contact_id');
          
          if (error) {
            console.log(`❌ Contact ${ppContact.display_name}:`, error.message);
          } else {
            this.stats.contacts++;
            // Cache the mapping for later use
            if (data && data[0]) {
              this.contactIdMap.set(ppContact.id, data[0].id);
            }
          }
          
        } catch (err) {
          console.log(`❌ Contact error:`, err.message);
        }
      }
      
      console.log(`✅ ${this.stats.contacts} contacts synced to business entity table\n`);
      
    } catch (error) {
      console.error('❌ Contacts sync failed:', error.message);
      console.log('');
    }
  }

  async syncExchanges() {
    console.log('🏢 Syncing Exchanges (PP matters → exchanges table)...');
    
    try {
      const response = await this.ppService.client.get('/matters', { params: { limit: 200 } });
      const matters = Object.values(response.data) || [];
      
      console.log(`📥 Found ${matters.length} PP matters`);
      
      for (const ppMatter of matters) {
        try {
          // Find coordinator and client from PP assigned users and account_ref
          let coordinator_id = null;
          let primary_client_id = null;
          
          // Map coordinator from PP assigned_to_users
          if (ppMatter.assigned_to_users && ppMatter.assigned_to_users.length > 0) {
            const firstAssignedUser = ppMatter.assigned_to_users[0];
            const ppUserId = firstAssignedUser.id || firstAssignedUser;
            coordinator_id = this.userIdMap.get(ppUserId);
          }
          
          // Map client from PP account_ref
          if (ppMatter.account_ref && ppMatter.account_ref.id) {
            // Find contact by account_ref - this is complex, we'll use a lookup
            const { data: matchingContacts } = await this.supabase
              .from('contacts')
              .select('id')
              .contains('pp_account_ref', { id: ppMatter.account_ref.id })
              .limit(1);
            
            if (matchingContacts && matchingContacts.length > 0) {
              primary_client_id = matchingContacts[0].id;
            }
          }
          
          // Map PP matter to business entity structure (using actual PP field names)
          const exchangeData = {
            exchange_number: `EX-${ppMatter.number || ppMatter.id}`,
            name: ppMatter.name || ppMatter.display_name,
            display_name: ppMatter.display_name,
            notes: ppMatter.notes,
            exchange_type: 'simultaneous', // Default, can be refined later
            
            // Key relationships
            coordinator_id: coordinator_id,
            primary_client_id: primary_client_id,
            assigned_users: ppMatter.assigned_to_users || [],
            
            // Status mapping from PP
            status: this.mapPPStatusToExchangeStatus(ppMatter.status),
            priority: 'medium', // Default
            tags: ppMatter.tags || [],
            
            // PP metadata for relationship mapping
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
      
      console.log(`✅ ${this.stats.exchanges} exchanges synced to business entity table\n`);
      
    } catch (error) {
      console.error('❌ Exchanges sync failed:', error.message);
      console.log('');
    }
  }

  async updateContactExchangeReferences() {
    console.log('🔗 Updating contact-exchange relationships...');
    
    try {
      // Update contacts with their primary exchange relationship
      const { data: exchanges } = await this.supabase
        .from('exchanges')
        .select('id, pp_account_ref, pp_matter_id');
      
      let updated = 0;
      
      for (const exchange of exchanges) {
        if (exchange.pp_account_ref && exchange.pp_account_ref.id) {
          const { error } = await this.supabase
            .from('contacts')
            .update({ primary_exchange_id: exchange.id })
            .contains('pp_account_ref', { id: exchange.pp_account_ref.id });
          
          if (!error) {
            updated++;
          }
        }
      }
      
      console.log(`✅ ${updated} contact-exchange relationships updated\n`);
      
    } catch (error) {
      console.error('❌ Contact-exchange relationship update failed:', error.message);
      console.log('');
    }
  }

  async syncTasks() {
    console.log('✅ Syncing Tasks (PP → tasks table)...');
    
    try {
      const response = await this.ppService.client.get('/tasks', { params: { limit: 100 } });
      const tasks = Object.values(response.data) || [];
      
      console.log(`📥 Found ${tasks.length} PP tasks`);
      
      for (const ppTask of tasks) {
        try {
          // Map relationships from PP data
          let exchange_id = null;
          let primary_contact_id = null;
          let assigned_to = null;
          
          // Map exchange from PP matter_ref
          if (ppTask.matter_ref && ppTask.matter_ref.id) {
            exchange_id = this.exchangeIdMap.get(ppTask.matter_ref.id);
          }
          
          // Map contact from PP account_ref
          if (ppTask.account_ref && ppTask.account_ref.id) {
            // Look up contact by account_ref
            const { data: matchingContacts } = await this.supabase
              .from('contacts')
              .select('id')
              .contains('pp_account_ref', { id: ppTask.account_ref.id })
              .limit(1);
            
            if (matchingContacts && matchingContacts.length > 0) {
              primary_contact_id = matchingContacts[0].id;
            }
          }
          
          // Map assigned user from PP assigned_to_users
          if (ppTask.assigned_to_users && ppTask.assigned_to_users.length > 0) {
            const firstAssignedUser = ppTask.assigned_to_users[0];
            const ppUserId = firstAssignedUser.id || firstAssignedUser;
            assigned_to = this.userIdMap.get(ppUserId);
          }
          
          const taskData = {
            title: ppTask.subject || 'Untitled Task',
            description: ppTask.notes,
            task_type: 'general', // Can be refined later
            
            // Relationships
            exchange_id: exchange_id,
            primary_contact_id: primary_contact_id,
            assigned_to: assigned_to,
            assigned_users: ppTask.assigned_to_users || [],
            assigned_contacts: ppTask.assigned_to_contacts || [],
            
            // Timeline
            due_date: ppTask.due_date ? this.parseDate(ppTask.due_date) : null,
            
            // Status mapping
            status: this.mapPPStatusToTaskStatus(ppTask.status),
            priority: ppTask.priority || 'medium',
            
            // Store all PP data in pp_ prefixed columns
            pp_task_id: ppTask.id,
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
            pp_synced_at: new Date(),
            pp_raw_data: ppTask
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
      
      console.log(`✅ ${this.stats.tasks} tasks synced to business entity table\n`);
      
    } catch (error) {
      console.error('❌ Tasks sync failed:', error.message);
      console.log('');
    }
  }

  async syncInvoices() {
    console.log('💰 Syncing Invoices (PP → invoices table)...');
    
    try {
      const response = await this.ppService.client.get('/invoices', { params: { limit: 100 } });
      const invoices = Object.values(response.data) || [];
      
      console.log(`📥 Found ${invoices.length} PP invoices`);
      
      for (const ppInvoice of invoices) {
        try {
          // Map relationships from PP data
          let exchange_id = null;
          let client_id = null;
          
          // Map exchange from PP matter_ref
          if (ppInvoice.matter_ref && ppInvoice.matter_ref.id) {
            exchange_id = this.exchangeIdMap.get(ppInvoice.matter_ref.id);
          }
          
          // Map client from PP account_ref
          if (ppInvoice.account_ref && ppInvoice.account_ref.id) {
            const { data: matchingContacts } = await this.supabase
              .from('contacts')
              .select('id')
              .contains('pp_account_ref', { id: ppInvoice.account_ref.id })
              .limit(1);
            
            if (matchingContacts && matchingContacts.length > 0) {
              client_id = matchingContacts[0].id;
            }
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
            
            status: 'sent', // Default
            invoice_type: ppInvoice.invoice_type || 'service',
            
            // Store all PP data in pp_ prefixed columns
            pp_invoice_id: ppInvoice.id,
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
            pp_synced_at: new Date(),
            pp_raw_data: ppInvoice
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
      
      console.log(`✅ ${this.stats.invoices} invoices synced to business entity table\n`);
      
    } catch (error) {
      console.error('❌ Invoices sync failed:', error.message);
      console.log('');
    }
  }

  async syncExpenses() {
    console.log('💳 Syncing Expenses (PP → expenses table)...');
    
    try {
      const response = await this.ppService.client.get('/expenses', { params: { limit: 50 } });
      const expenses = Object.values(response.data) || [];
      
      console.log(`📥 Found ${expenses.length} PP expenses`);
      
      for (const ppExpense of expenses) {
        try {
          // Map relationships from PP data
          let exchange_id = null;
          let client_id = null;
          let user_id = null;
          
          // Map exchange from PP matter_ref
          if (ppExpense.matter_ref && ppExpense.matter_ref.id) {
            exchange_id = this.exchangeIdMap.get(ppExpense.matter_ref.id);
          }
          
          // Map client from PP account_ref
          if (ppExpense.account_ref && ppExpense.account_ref.id) {
            const { data: matchingContacts } = await this.supabase
              .from('contacts')
              .select('id')
              .contains('pp_account_ref', { id: ppExpense.account_ref.id })
              .limit(1);
            
            if (matchingContacts && matchingContacts.length > 0) {
              client_id = matchingContacts[0].id;
            }
          }
          
          // Map user from PP billed_by_user_ref
          if (ppExpense.billed_by_user_ref && ppExpense.billed_by_user_ref.id) {
            user_id = this.userIdMap.get(ppExpense.billed_by_user_ref.id);
          }
          
          const expenseData = {
            description: ppExpense.description || 'Expense',
            amount: (ppExpense.amount || 0) / 100, // Convert from cents
            expense_date: this.parseDate(ppExpense.date),
            quantity: ppExpense.qty || 1,
            
            // Relationships
            exchange_id: exchange_id,
            client_id: client_id,
            user_id: user_id,
            
            // Business logic
            is_billable: ppExpense.is_billable !== false,
            is_billed: ppExpense.is_billed === true,
            
            // Store all PP data in pp_ prefixed columns
            pp_expense_id: ppExpense.id,
            pp_account_ref: ppExpense.account_ref || {},
            pp_matter_ref: ppExpense.matter_ref || {},
            pp_billed_by_user_ref: ppExpense.billed_by_user_ref || {},
            pp_expense_category_ref: ppExpense.expense_category_ref || {},
            pp_is_billable: ppExpense.is_billable,
            pp_is_billed: ppExpense.is_billed,
            pp_date: ppExpense.date,
            pp_qty: ppExpense.qty,
            pp_price: ppExpense.price,
            pp_amount: ppExpense.amount,
            pp_description: ppExpense.description,
            pp_private_notes: ppExpense.private_notes,
            pp_created_at: ppExpense.created_at,
            pp_updated_at: ppExpense.updated_at,
            pp_synced_at: new Date(),
            pp_raw_data: ppExpense
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
      
      console.log(`✅ ${this.stats.expenses} expenses synced to business entity table\n`);
      
    } catch (error) {
      console.error('❌ Expenses sync failed:', error.message);
      console.log('');
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

  async showResults() {
    console.log('🎉 BUSINESS ENTITY SYNC COMPLETED!');
    console.log('=====================================');
    
    const totalSynced = Object.values(this.stats).reduce((a, b) => a + b, 0);
    
    console.log(`Users      : ${this.stats.users.toLocaleString()}`);
    console.log(`Contacts   : ${this.stats.contacts.toLocaleString()}`);
    console.log(`Exchanges  : ${this.stats.exchanges.toLocaleString()}`);
    console.log(`Tasks      : ${this.stats.tasks.toLocaleString()}`);
    console.log(`Invoices   : ${this.stats.invoices.toLocaleString()}`);
    console.log(`Expenses   : ${this.stats.expenses.toLocaleString()}`);
    console.log(`TOTAL      : ${totalSynced.toLocaleString()} business entity records`);
    
    console.log('\n📊 Business Entity Verification:');
    
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
    
    console.log('\n🔗 Relationship Verification:');
    
    // Check foreign key relationships
    const relationshipChecks = [
      { table: 'contacts', column: 'primary_exchange_id', ref: 'exchanges' },
      { table: 'exchanges', column: 'coordinator_id', ref: 'users' },
      { table: 'exchanges', column: 'primary_client_id', ref: 'contacts' },
      { table: 'tasks', column: 'exchange_id', ref: 'exchanges' },
      { table: 'tasks', column: 'assigned_to', ref: 'users' },
      { table: 'invoices', column: 'exchange_id', ref: 'exchanges' },
      { table: 'invoices', column: 'client_id', ref: 'contacts' },
      { table: 'expenses', column: 'exchange_id', ref: 'exchanges' },
      { table: 'expenses', column: 'user_id', ref: 'users' }
    ];
    
    for (const check of relationshipChecks) {
      try {
        const { count } = await this.supabase
          .from(check.table)
          .select(check.column, { count: 'exact', head: true })
          .not(check.column, 'is', null);
        
        console.log(`${check.table}.${check.column} → ${check.ref}: ${count || 0} linked records`);
      } catch (err) {
        console.log(`${check.table}.${check.column}: Error checking relationships`);
      }
    }
    
    console.log('\n✅ Business entity sync completed with proper relationships!');
    console.log('🚀 Your 1031 platform is now ready with integrated PracticePanther data!');
  }
}

// Run if called directly
if (require.main === module) {
  const sync = new BusinessEntitySync();
  sync.run()
    .then(() => {
      console.log('\n🎉 Business entity sync completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Business entity sync failed:', error.message);
      process.exit(1);
    });
}

module.exports = BusinessEntitySync;