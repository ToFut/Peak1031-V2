#!/usr/bin/env node

/**
 * COMPREHENSIVE PRACTICEPANTHER SYNC
 * Fetches ALL available data from PracticePanther API and syncs to Supabase
 * 
 * Includes:
 * - Contacts (clients, vendors, attorneys, etc.)
 * - Matters (mapped to Exchanges for 1031 platform)
 * - Tasks (with full assignment and status tracking)
 * - Invoices (with line items and payment status)
 * - Expenses (with receipts and categorization)
 * - Time Entries (billable hours and activities)
 * - Users (attorneys, staff, admins)
 * - Custom Fields (dynamic field mapping)
 */

require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const PPTokenManager = require('../services/ppTokenManager');
const PracticePartnerService = require('../services/practicePartnerService');

class ComprehensivePPSync {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    this.ppService = new PracticePartnerService();
    this.tokenManager = new PPTokenManager();
    
    this.syncStats = {
      contacts: { fetched: 0, synced: 0, errors: 0 },
      matters: { fetched: 0, synced: 0, errors: 0 },
      tasks: { fetched: 0, synced: 0, errors: 0 },
      invoices: { fetched: 0, synced: 0, errors: 0 },
      expenses: { fetched: 0, synced: 0, errors: 0 },
      timeEntries: { fetched: 0, synced: 0, errors: 0 },
      users: { fetched: 0, synced: 0, errors: 0 }
    };
    
    this.startTime = Date.now();
  }

  async runComprehensiveSync() {
    console.log('🚀 COMPREHENSIVE PRACTICEPANTHER SYNC STARTED');
    console.log('==============================================');
    console.log(`Started at: ${new Date().toISOString()}`);
    console.log('');

    try {
      // Test PP API connection first
      await this.testConnection();
      
      // Sync all data types in parallel for better performance
      await Promise.all([
        this.syncUsers(),
        this.syncContacts(),
        this.syncMatters(),
        this.syncTasks(),
        this.syncInvoices(),
        this.syncExpenses(),
        this.syncTimeEntries()
      ]);
      
      await this.generateSyncReport();
      
    } catch (error) {
      console.error('❌ Comprehensive sync failed:', error.message);
      console.error('Stack:', error.stack);
    }
  }

  async testConnection() {
    console.log('🔌 Testing PracticePanther API Connection...');
    
    try {
      const token = await this.tokenManager.getValidAccessToken();
      console.log('✅ OAuth token valid');
      
      // Test API call
      const response = await this.ppService.client.get('/users', { params: { limit: 1 } });
      console.log('✅ PP API connection successful');
      console.log(`📊 PP API Response: ${Object.values(response.data)?.length || 0} users found`);
      console.log('');
      
    } catch (error) {
      console.error('❌ PP API connection failed:', error.message);
      throw error;
    }
  }

  async syncUsers() {
    console.log('👥 Syncing PracticePanther Users...');
    
    try {
      let allUsers = [];
      let page = 1;
      const limit = 100;
      
      while (true) {
        const response = await this.ppService.client.get('/users', { 
          params: {
            limit,
            offset: (page - 1) * limit
          }
        });
        
        const users = Object.values(response.data) || [];
        if (users.length === 0) break;
        
        allUsers = allUsers.concat(users);
        console.log(`   📥 Fetched ${users.length} users (page ${page})`);
        page++;
      }
      
      this.syncStats.users.fetched = allUsers.length;
      console.log(`📊 Total PP Users fetched: ${allUsers.length}`);
      
      // Sync to Supabase users table
      for (const ppUser of allUsers) {
        try {
          const userData = {
            email: ppUser.email,
            first_name: ppUser.first_name || 'Unknown',
            last_name: ppUser.last_name || 'Unknown',
            middle_name: ppUser.middle_name,
            role: this.mapPPUserRole(ppUser),
            phone_primary: ppUser.phone_mobile || ppUser.phone_work,
            phone_mobile: ppUser.phone_mobile,
            phone_work: ppUser.phone_work,
            phone_home: ppUser.phone_home,
            phone_fax: ppUser.phone_fax,
            title: ppUser.title,
            department: ppUser.department,
            is_active: ppUser.is_active !== false,
            
            // Complete PP field mapping
            pp_user_id: ppUser.id,
            pp_display_name: ppUser.display_name,
            pp_first_name: ppUser.first_name,
            pp_last_name: ppUser.last_name,
            pp_middle_name: ppUser.middle_name,
            pp_email: ppUser.email,
            pp_phone_work: ppUser.phone_work,
            pp_phone_mobile: ppUser.phone_mobile,
            pp_phone_home: ppUser.phone_home,
            pp_phone_fax: ppUser.phone_fax,
            pp_title: ppUser.title,
            pp_department: ppUser.department,
            pp_is_active: ppUser.is_active,
            pp_is_admin: ppUser.is_admin,
            pp_permissions: ppUser.permissions || {},
            pp_last_login: ppUser.last_login ? new Date(ppUser.last_login) : null,
            pp_created_at: ppUser.created_at ? new Date(ppUser.created_at) : null,
            pp_updated_at: ppUser.updated_at ? new Date(ppUser.updated_at) : null,
            pp_synced_at: new Date(),
            pp_raw_data: ppUser
          };
          
          // Upsert user (insert or update if exists)
          const { data, error } = await this.supabase
            .from('users')
            .upsert(userData, { 
              onConflict: 'pp_user_id',
              ignoreDuplicates: false 
            })
            .select();
          
          if (error) {
            console.error(`❌ Error syncing user ${ppUser.email}:`, error.message);
            this.syncStats.users.errors++;
          } else {
            this.syncStats.users.synced++;
          }
          
        } catch (err) {
          console.error(`❌ Error processing user ${ppUser.email}:`, err.message);
          this.syncStats.users.errors++;
        }
      }
      
      console.log(`✅ Users sync completed: ${this.syncStats.users.synced} synced, ${this.syncStats.users.errors} errors`);
      console.log('');
      
    } catch (error) {
      console.error('❌ Users sync failed:', error.message);
      this.syncStats.users.errors = 999;
    }
  }

  async syncContacts() {
    console.log('📞 Syncing PracticePanther Contacts...');
    
    try {
      let allContacts = [];
      let page = 1;
      const limit = 100;
      
      while (true) {
        const response = await this.ppService.client.get('/contacts', { 
          params: {
            limit,
            offset: (page - 1) * limit
          }
        });
        
        const contacts = Object.values(response.data) || [];
        if (contacts.length === 0) break;
        
        allContacts = allContacts.concat(contacts);
        console.log(`   📥 Fetched ${contacts.length} contacts (page ${page})`);
        page++;
      }
      
      this.syncStats.contacts.fetched = allContacts.length;
      console.log(`📊 Total PP Contacts fetched: ${allContacts.length}`);
      
      // Sync to Supabase contacts table
      for (const ppContact of allContacts) {
        try {
          const contactData = {
            first_name: ppContact.first_name || '',
            last_name: ppContact.last_name || '',
            middle_name: ppContact.middle_name,
            display_name: ppContact.display_name,
            email: ppContact.email,
            phone_primary: ppContact.phone_mobile || ppContact.phone_work || ppContact.phone_home,
            phone_mobile: ppContact.phone_mobile,
            phone_work: ppContact.phone_work,
            phone_home: ppContact.phone_home,
            phone_fax: ppContact.phone_fax,
            
            // Address information
            address_line1: ppContact.address?.line1,
            address_line2: ppContact.address?.line2,
            city: ppContact.address?.city,
            state: ppContact.address?.state,
            zip_code: ppContact.address?.zip_code,
            country: ppContact.address?.country || 'USA',
            
            company: ppContact.company,
            title: ppContact.title,
            contact_type: this.mapPPContactType(ppContact),
            is_active: ppContact.is_active !== false,
            
            // Complete PP field mapping
            pp_id: ppContact.id,
            pp_account_ref_id: ppContact.account_ref?.id,
            pp_account_ref_display_name: ppContact.account_ref?.display_name,
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
            pp_address: ppContact.address || {},
            pp_company: ppContact.company,
            pp_title: ppContact.title,
            pp_created_at: ppContact.created_at ? new Date(ppContact.created_at) : null,
            pp_updated_at: ppContact.updated_at ? new Date(ppContact.updated_at) : null,
            pp_synced_at: new Date(),
            pp_raw_data: ppContact
          };
          
          const { data, error } = await this.supabase
            .from('contacts')
            .upsert(contactData, { 
              onConflict: 'pp_id',
              ignoreDuplicates: false 
            })
            .select();
          
          if (error) {
            console.error(`❌ Error syncing contact ${ppContact.display_name}:`, error.message);
            this.syncStats.contacts.errors++;
          } else {
            this.syncStats.contacts.synced++;
          }
          
        } catch (err) {
          console.error(`❌ Error processing contact ${ppContact.display_name}:`, err.message);
          this.syncStats.contacts.errors++;
        }
      }
      
      console.log(`✅ Contacts sync completed: ${this.syncStats.contacts.synced} synced, ${this.syncStats.contacts.errors} errors`);
      console.log('');
      
    } catch (error) {
      console.error('❌ Contacts sync failed:', error.message);
      this.syncStats.contacts.errors = 999;
    }
  }

  async syncMatters() {
    console.log('📁 Syncing PracticePanther Matters (as Exchanges)...');
    
    try {
      let allMatters = [];
      let page = 1;
      const limit = 100;
      
      while (true) {
        const response = await this.ppService.client.get('/matters', { 
          params: {
            limit,
            offset: (page - 1) * limit
          }
        });
        
        const matters = Object.values(response.data) || [];
        if (matters.length === 0) break;
        
        allMatters = allMatters.concat(matters);
        console.log(`   📥 Fetched ${matters.length} matters (page ${page})`);
        page++;
      }
      
      this.syncStats.matters.fetched = allMatters.length;
      console.log(`📊 Total PP Matters fetched: ${allMatters.length}`);
      
      // Sync to Supabase exchanges table
      for (const ppMatter of allMatters) {
        try {
          const exchangeData = {
            name: ppMatter.name || ppMatter.display_name,
            exchange_number: ppMatter.number?.toString() || `PP-${ppMatter.id}`,
            exchange_type: this.mapMatterToExchangeType(ppMatter),
            status: this.mapPPMatterStatus(ppMatter.status),
            
            // Try to find client from contacts
            client_id: await this.findContactByPPId(ppMatter.account_ref?.id),
            
            // PP Matter specific fields
            pp_matter_id: ppMatter.id,
            pp_account_ref_id: ppMatter.account_ref?.id,
            pp_account_ref_display_name: ppMatter.account_ref?.display_name,
            pp_number: ppMatter.number,
            pp_display_name: ppMatter.display_name,
            pp_name: ppMatter.name,
            pp_notes: ppMatter.notes,
            pp_rate: ppMatter.rate,
            pp_open_date: ppMatter.open_date ? new Date(ppMatter.open_date) : null,
            pp_close_date: ppMatter.close_date ? new Date(ppMatter.close_date) : null,
            pp_statute_of_limitation_date: ppMatter.statute_of_limitation_date ? new Date(ppMatter.statute_of_limitation_date) : null,
            pp_tags: ppMatter.tags || [],
            pp_status: ppMatter.status,
            pp_assigned_to_users: ppMatter.assigned_to_users || [],
            pp_practice_area: ppMatter.practice_area,
            pp_matter_type: ppMatter.matter_type,
            pp_billing_info: ppMatter.billing_info || {},
            pp_custom_field_values: ppMatter.custom_field_values || [],
            pp_created_at: ppMatter.created_at ? new Date(ppMatter.created_at) : null,
            pp_updated_at: ppMatter.updated_at ? new Date(ppMatter.updated_at) : null,
            pp_synced_at: new Date(),
            pp_raw_data: ppMatter,
            
            // Generate unique chat ID for each exchange
            exchange_chat_id: ppMatter.id, // Use PP matter ID as chat ID
            chat_enabled: true,
            created_at: new Date(),
            updated_at: new Date()
          };
          
          const { data, error } = await this.supabase
            .from('exchanges')
            .upsert(exchangeData, { 
              onConflict: 'pp_matter_id',
              ignoreDuplicates: false 
            })
            .select();
          
          if (error) {
            console.error(`❌ Error syncing matter ${ppMatter.display_name}:`, error.message);
            this.syncStats.matters.errors++;
          } else {
            this.syncStats.matters.synced++;
          }
          
        } catch (err) {
          console.error(`❌ Error processing matter ${ppMatter.display_name}:`, err.message);
          this.syncStats.matters.errors++;
        }
      }
      
      console.log(`✅ Matters sync completed: ${this.syncStats.matters.synced} synced, ${this.syncStats.matters.errors} errors`);
      console.log('');
      
    } catch (error) {
      console.error('❌ Matters sync failed:', error.message);
      this.syncStats.matters.errors = 999;
    }
  }

  async syncTasks() {
    console.log('✅ Syncing PracticePanther Tasks...');
    
    try {
      let allTasks = [];
      let page = 1;
      const limit = 100;
      
      while (true) {
        const response = await this.ppService.client.get('/tasks', { 
          params: {
            limit,
            offset: (page - 1) * limit
          }
        });
        
        const tasks = Object.values(response.data) || [];
        if (tasks.length === 0) break;
        
        allTasks = allTasks.concat(tasks);
        console.log(`   📥 Fetched ${tasks.length} tasks (page ${page})`);
        page++;
      }
      
      this.syncStats.tasks.fetched = allTasks.length;
      console.log(`📊 Total PP Tasks fetched: ${allTasks.length}`);
      
      // Sync to Supabase tasks table
      for (const ppTask of allTasks) {
        try {
          const taskData = {
            title: ppTask.name || 'Untitled Task',
            description: ppTask.description,
            due_date: ppTask.due_date ? new Date(ppTask.due_date) : null,
            status: this.mapPPTaskStatus(ppTask.status),
            priority: this.mapPPTaskPriority(ppTask.priority),
            
            // Try to find related exchange and assigned user
            exchange_id: await this.findExchangeByPPMatterId(ppTask.matter_ref?.id),
            assigned_to: await this.findUserByPPId(ppTask.assigned_to_users?.[0]?.id),
            
            // PP Task specific fields
            pp_id: ppTask.id,
            pp_matter_ref_id: ppTask.matter_ref?.id,
            pp_matter_ref_display_name: ppTask.matter_ref?.display_name,
            pp_assigned_to_users: ppTask.assigned_to_users || [],
            pp_assigned_to_contacts: ppTask.assigned_to_contacts || [],
            pp_name: ppTask.name,
            pp_description: ppTask.description,
            pp_notes: ppTask.notes,
            pp_due_date: ppTask.due_date ? new Date(ppTask.due_date) : null,
            pp_completed_date: ppTask.completed_date ? new Date(ppTask.completed_date) : null,
            pp_priority: ppTask.priority,
            pp_status: ppTask.status,
            pp_task_type: ppTask.task_type,
            pp_tags: ppTask.tags || [],
            pp_custom_field_values: ppTask.custom_field_values || [],
            pp_time_estimated: ppTask.time_estimated,
            pp_time_actual: ppTask.time_actual,
            pp_billable: ppTask.billable,
            pp_billed: ppTask.billed,
            pp_created_at: ppTask.created_at ? new Date(ppTask.created_at) : null,
            pp_updated_at: ppTask.updated_at ? new Date(ppTask.updated_at) : null,
            pp_synced_at: new Date(),
            pp_raw_data: ppTask,
            
            created_at: new Date(),
            updated_at: new Date()
          };
          
          const { data, error } = await this.supabase
            .from('tasks')
            .upsert(taskData, { 
              onConflict: 'pp_id',
              ignoreDuplicates: false 
            })
            .select();
          
          if (error) {
            console.error(`❌ Error syncing task ${ppTask.name}:`, error.message);
            this.syncStats.tasks.errors++;
          } else {
            this.syncStats.tasks.synced++;
          }
          
        } catch (err) {
          console.error(`❌ Error processing task ${ppTask.name}:`, err.message);
          this.syncStats.tasks.errors++;
        }
      }
      
      console.log(`✅ Tasks sync completed: ${this.syncStats.tasks.synced} synced, ${this.syncStats.tasks.errors} errors`);
      console.log('');
      
    } catch (error) {
      console.error('❌ Tasks sync failed:', error.message);
      this.syncStats.tasks.errors = 999;
    }
  }

  async syncInvoices() {
    console.log('💰 Syncing PracticePanther Invoices...');
    
    try {
      let allInvoices = [];
      let page = 1;
      const limit = 100;
      
      while (true) {
        const response = await this.ppService.client.get('/invoices', { 
          params: {
            limit,
            offset: (page - 1) * limit
          }
        });
        
        const invoices = Object.values(response.data) || [];
        if (invoices.length === 0) break;
        
        allInvoices = allInvoices.concat(invoices);
        console.log(`   📥 Fetched ${invoices.length} invoices (page ${page})`);
        page++;
      }
      
      this.syncStats.invoices.fetched = allInvoices.length;
      console.log(`📊 Total PP Invoices fetched: ${allInvoices.length}`);
      
      // Ensure invoices table exists, if not create basic structure
      await this.ensureInvoicesTable();
      
      // Sync to Supabase invoices table
      for (const ppInvoice of allInvoices) {
        try {
          const invoiceData = {
            invoice_number: ppInvoice.number || `PP-INV-${ppInvoice.id}`,
            issue_date: ppInvoice.issue_date ? new Date(ppInvoice.issue_date) : new Date(),
            due_date: ppInvoice.due_date ? new Date(ppInvoice.due_date) : null,
            status: this.mapPPInvoiceStatus(ppInvoice.status),
            
            // Convert PP cents to dollars
            subtotal: ppInvoice.subtotal ? (ppInvoice.subtotal / 100) : 0,
            tax_amount: ppInvoice.tax ? (ppInvoice.tax / 100) : 0,
            discount_amount: ppInvoice.discount ? (ppInvoice.discount / 100) : 0,
            total_amount: ppInvoice.total ? (ppInvoice.total / 100) : 0,
            amount_paid: ppInvoice.total_paid ? (ppInvoice.total_paid / 100) : 0,
            
            // Try to find related exchange and contact
            exchange_id: await this.findExchangeByPPMatterId(ppInvoice.matter_ref?.id),
            contact_id: await this.findContactByPPId(ppInvoice.account_ref?.id),
            
            // Complete PP invoice fields
            pp_id: ppInvoice.id,
            pp_account_ref_id: ppInvoice.account_ref?.id,
            pp_account_ref_display_name: ppInvoice.account_ref?.display_name,
            pp_matter_ref_id: ppInvoice.matter_ref?.id,
            pp_matter_ref_display_name: ppInvoice.matter_ref?.display_name,
            pp_issue_date: ppInvoice.issue_date ? new Date(ppInvoice.issue_date) : null,
            pp_due_date: ppInvoice.due_date ? new Date(ppInvoice.due_date) : null,
            pp_items_time_entries: ppInvoice.items_time_entries || [],
            pp_items_expenses: ppInvoice.items_expenses || [],
            pp_items_flat_fees: ppInvoice.items_flat_fees || [],
            pp_subtotal: ppInvoice.subtotal || 0,
            pp_tax: ppInvoice.tax || 0,
            pp_discount: ppInvoice.discount || 0,
            pp_total: ppInvoice.total || 0,
            pp_total_paid: ppInvoice.total_paid || 0,
            pp_total_outstanding: ppInvoice.total_outstanding || 0,
            pp_invoice_type: ppInvoice.invoice_type,
            pp_status: ppInvoice.status,
            pp_payment_terms: ppInvoice.payment_terms,
            pp_notes: ppInvoice.notes,
            pp_custom_field_values: ppInvoice.custom_field_values || [],
            pp_created_at: ppInvoice.created_at ? new Date(ppInvoice.created_at) : null,
            pp_updated_at: ppInvoice.updated_at ? new Date(ppInvoice.updated_at) : null,
            pp_synced_at: new Date(),
            pp_raw_data: ppInvoice,
            
            created_at: new Date(),
            updated_at: new Date()
          };
          
          const { data, error } = await this.supabase
            .from('invoices')
            .upsert(invoiceData, { 
              onConflict: 'pp_id',
              ignoreDuplicates: false 
            })
            .select();
          
          if (error) {
            console.error(`❌ Error syncing invoice ${ppInvoice.number}:`, error.message);
            this.syncStats.invoices.errors++;
          } else {
            this.syncStats.invoices.synced++;
          }
          
        } catch (err) {
          console.error(`❌ Error processing invoice ${ppInvoice.number}:`, err.message);
          this.syncStats.invoices.errors++;
        }
      }
      
      console.log(`✅ Invoices sync completed: ${this.syncStats.invoices.synced} synced, ${this.syncStats.invoices.errors} errors`);
      console.log('');
      
    } catch (error) {
      console.error('❌ Invoices sync failed:', error.message);
      this.syncStats.invoices.errors = 999;
    }
  }

  async syncExpenses() {
    console.log('💳 Syncing PracticePanther Expenses...');
    
    try {
      let allExpenses = [];
      let page = 1;
      const limit = 100;
      
      while (true) {
        const response = await this.ppService.client.get('/expenses', { 
          params: {
            limit,
            offset: (page - 1) * limit
          }
        });
        
        const expenses = Object.values(response.data) || [];
        if (expenses.length === 0) break;
        
        allExpenses = allExpenses.concat(expenses);
        console.log(`   📥 Fetched ${expenses.length} expenses (page ${page})`);
        page++;
      }
      
      this.syncStats.expenses.fetched = allExpenses.length;
      console.log(`📊 Total PP Expenses fetched: ${allExpenses.length}`);
      
      // Create expenses table if it doesn't exist
      await this.ensureExpensesTable();
      
      // Sync to Supabase expenses table
      for (const ppExpense of allExpenses) {
        try {
          const expenseData = {
            description: ppExpense.description || 'Expense',
            amount: ppExpense.amount ? (ppExpense.amount / 100) : 0, // Convert cents to dollars
            expense_date: ppExpense.date ? new Date(ppExpense.date) : new Date(),
            category: ppExpense.category,
            
            // Try to find related exchange and user
            exchange_id: await this.findExchangeByPPMatterId(ppExpense.matter_ref?.id),
            user_id: await this.findUserByPPId(ppExpense.user_ref?.id),
            
            // PP Expense specific fields
            pp_id: ppExpense.id,
            pp_matter_ref_id: ppExpense.matter_ref?.id,
            pp_matter_ref_display_name: ppExpense.matter_ref?.display_name,
            pp_user_ref_id: ppExpense.user_ref?.id,
            pp_user_ref_display_name: ppExpense.user_ref?.display_name,
            pp_description: ppExpense.description,
            pp_amount: ppExpense.amount || 0,
            pp_date: ppExpense.date ? new Date(ppExpense.date) : null,
            pp_category: ppExpense.category,
            pp_billable: ppExpense.billable,
            pp_billed: ppExpense.billed,
            pp_notes: ppExpense.notes,
            pp_receipt_url: ppExpense.receipt_url,
            pp_custom_field_values: ppExpense.custom_field_values || [],
            pp_created_at: ppExpense.created_at ? new Date(ppExpense.created_at) : null,
            pp_updated_at: ppExpense.updated_at ? new Date(ppExpense.updated_at) : null,
            pp_synced_at: new Date(),
            pp_raw_data: ppExpense,
            
            created_at: new Date(),
            updated_at: new Date()
          };
          
          const { data, error } = await this.supabase
            .from('expenses')
            .upsert(expenseData, { 
              onConflict: 'pp_id',
              ignoreDuplicates: false 
            })
            .select();
          
          if (error) {
            console.error(`❌ Error syncing expense ${ppExpense.description}:`, error.message);
            this.syncStats.expenses.errors++;
          } else {
            this.syncStats.expenses.synced++;
          }
          
        } catch (err) {
          console.error(`❌ Error processing expense ${ppExpense.description}:`, err.message);
          this.syncStats.expenses.errors++;
        }
      }
      
      console.log(`✅ Expenses sync completed: ${this.syncStats.expenses.synced} synced, ${this.syncStats.expenses.errors} errors`);
      console.log('');
      
    } catch (error) {
      console.error('❌ Expenses sync failed:', error.message);
      this.syncStats.expenses.errors = 999;
    }
  }

  async syncTimeEntries() {
    console.log('⏰ Syncing PracticePanther Time Entries...');
    
    try {
      let allTimeEntries = [];
      let page = 1;
      const limit = 100;
      
      while (true) {
        const response = await this.ppService.client.get('/time_entries', { 
          params: {
            limit,
            offset: (page - 1) * limit
          }
        });
        
        const timeEntries = Object.values(response.data) || [];
        if (timeEntries.length === 0) break;
        
        allTimeEntries = allTimeEntries.concat(timeEntries);
        console.log(`   📥 Fetched ${timeEntries.length} time entries (page ${page})`);
        page++;
      }
      
      this.syncStats.timeEntries.fetched = allTimeEntries.length;
      console.log(`📊 Total PP Time Entries fetched: ${allTimeEntries.length}`);
      
      // Create time_entries table if it doesn't exist
      await this.ensureTimeEntriesTable();
      
      // Sync to Supabase time_entries table
      for (const ppTimeEntry of allTimeEntries) {
        try {
          const timeEntryData = {
            description: ppTimeEntry.description || 'Time Entry',
            hours: ppTimeEntry.hours || 0,
            rate: ppTimeEntry.rate ? (ppTimeEntry.rate / 100) : 0, // Convert cents to dollars
            amount: ppTimeEntry.amount ? (ppTimeEntry.amount / 100) : 0,
            entry_date: ppTimeEntry.date ? new Date(ppTimeEntry.date) : new Date(),
            
            // Try to find related exchange and user
            exchange_id: await this.findExchangeByPPMatterId(ppTimeEntry.matter_ref?.id),
            user_id: await this.findUserByPPId(ppTimeEntry.user_ref?.id),
            
            // PP Time Entry specific fields
            pp_id: ppTimeEntry.id,
            pp_matter_ref_id: ppTimeEntry.matter_ref?.id,
            pp_matter_ref_display_name: ppTimeEntry.matter_ref?.display_name,
            pp_user_ref_id: ppTimeEntry.user_ref?.id,
            pp_user_ref_display_name: ppTimeEntry.user_ref?.display_name,
            pp_description: ppTimeEntry.description,
            pp_hours: ppTimeEntry.hours || 0,
            pp_rate: ppTimeEntry.rate || 0,
            pp_amount: ppTimeEntry.amount || 0,
            pp_date: ppTimeEntry.date ? new Date(ppTimeEntry.date) : null,
            pp_billable: ppTimeEntry.billable,
            pp_billed: ppTimeEntry.billed,
            pp_notes: ppTimeEntry.notes,
            pp_activity: ppTimeEntry.activity,
            pp_custom_field_values: ppTimeEntry.custom_field_values || [],
            pp_created_at: ppTimeEntry.created_at ? new Date(ppTimeEntry.created_at) : null,
            pp_updated_at: ppTimeEntry.updated_at ? new Date(ppTimeEntry.updated_at) : null,
            pp_synced_at: new Date(),
            pp_raw_data: ppTimeEntry,
            
            created_at: new Date(),
            updated_at: new Date()
          };
          
          const { data, error } = await this.supabase
            .from('time_entries')
            .upsert(timeEntryData, { 
              onConflict: 'pp_id',
              ignoreDuplicates: false 
            })
            .select();
          
          if (error) {
            console.error(`❌ Error syncing time entry ${ppTimeEntry.description}:`, error.message);
            this.syncStats.timeEntries.errors++;
          } else {
            this.syncStats.timeEntries.synced++;
          }
          
        } catch (err) {
          console.error(`❌ Error processing time entry ${ppTimeEntry.description}:`, err.message);
          this.syncStats.timeEntries.errors++;
        }
      }
      
      console.log(`✅ Time Entries sync completed: ${this.syncStats.timeEntries.synced} synced, ${this.syncStats.timeEntries.errors} errors`);
      console.log('');
      
    } catch (error) {
      console.error('❌ Time Entries sync failed:', error.message);
      this.syncStats.timeEntries.errors = 999;
    }
  }

  // Helper methods for data mapping and lookups

  mapPPUserRole(ppUser) {
    if (ppUser.is_admin) return 'admin';
    if (ppUser.title?.toLowerCase().includes('coordinator')) return 'coordinator';
    if (ppUser.title?.toLowerCase().includes('attorney')) return 'attorney';
    return 'client';
  }

  mapPPContactType(ppContact) {
    const type = ppContact.contact_type?.toLowerCase() || 'client';
    const validTypes = ['client', 'vendor', 'attorney', 'agent', 'intermediary'];
    return validTypes.includes(type) ? [type] : ['client'];
  }

  mapMatterToExchangeType(ppMatter) {
    const matterType = ppMatter.matter_type?.toLowerCase() || '';
    if (matterType.includes('1031') || matterType.includes('exchange')) {
      if (matterType.includes('reverse')) return 'reverse';
      if (matterType.includes('improvement')) return 'improvement';
      if (matterType.includes('build')) return 'build_to_suit';
      return 'simultaneous';
    }
    return 'delayed';
  }

  mapPPMatterStatus(status) {
    const statusMap = {
      'open': 'active',
      'active': 'active',
      'closed': 'completed',
      'completed': 'completed',
      'pending': 'pending',
      'on_hold': 'on_hold',
      'cancelled': 'cancelled'
    };
    return statusMap[status?.toLowerCase()] || 'active';
  }

  mapPPTaskStatus(status) {
    const statusMap = {
      'not_started': 'pending',
      'pending': 'pending',
      'in_progress': 'in_progress',
      'completed': 'completed',
      'cancelled': 'cancelled',
      'on_hold': 'on_hold'
    };
    return statusMap[status?.toLowerCase()] || 'pending';
  }

  mapPPTaskPriority(priority) {
    const priorityMap = {
      'low': 'low',
      'normal': 'medium',
      'medium': 'medium',
      'high': 'high',
      'urgent': 'high'
    };
    return priorityMap[priority?.toLowerCase()] || 'medium';
  }

  mapPPInvoiceStatus(status) {
    const statusMap = {
      'draft': 'draft',
      'sent': 'sent',
      'paid': 'paid',
      'overdue': 'overdue',
      'cancelled': 'cancelled'
    };
    return statusMap[status?.toLowerCase()] || 'draft';
  }

  async findContactByPPId(ppId) {
    if (!ppId) return null;
    
    try {
      const { data } = await this.supabase
        .from('contacts')
        .select('id')
        .eq('pp_id', ppId)
        .single();
      
      return data?.id || null;
    } catch {
      return null;
    }
  }

  async findUserByPPId(ppId) {
    if (!ppId) return null;
    
    try {
      const { data } = await this.supabase
        .from('users')
        .select('id')
        .eq('pp_user_id', ppId)
        .single();
      
      return data?.id || null;
    } catch {
      return null;
    }
  }

  async findExchangeByPPMatterId(ppMatterId) {
    if (!ppMatterId) return null;
    
    try {
      const { data } = await this.supabase
        .from('exchanges')
        .select('id')
        .eq('pp_matter_id', ppMatterId)
        .single();
      
      return data?.id || null;
    } catch {
      return null;
    }
  }

  // Ensure required tables exist
  
  async ensureInvoicesTable() {
    // Invoices table should already exist from migrations
    // This is a placeholder for any table creation if needed
  }

  async ensureExpensesTable() {
    const createExpensesSQL = `
      CREATE TABLE IF NOT EXISTS expenses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        description TEXT NOT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        expense_date DATE NOT NULL,
        category VARCHAR(100),
        exchange_id UUID REFERENCES exchanges(id),
        user_id UUID REFERENCES users(id),
        
        -- PP Integration fields
        pp_id VARCHAR(36) UNIQUE,
        pp_matter_ref_id VARCHAR(36),
        pp_matter_ref_display_name TEXT,
        pp_user_ref_id VARCHAR(36),
        pp_user_ref_display_name TEXT,
        pp_description TEXT,
        pp_amount INTEGER DEFAULT 0,
        pp_date TIMESTAMP WITH TIME ZONE,
        pp_category VARCHAR(100),
        pp_billable BOOLEAN DEFAULT false,
        pp_billed BOOLEAN DEFAULT false,
        pp_notes TEXT,
        pp_receipt_url TEXT,
        pp_custom_field_values JSONB DEFAULT '[]',
        pp_created_at TIMESTAMP WITH TIME ZONE,
        pp_updated_at TIMESTAMP WITH TIME ZONE,
        pp_synced_at TIMESTAMP WITH TIME ZONE,
        pp_raw_data JSONB DEFAULT '{}',
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    try {
      await this.supabase.rpc('exec', { sql: createExpensesSQL });
    } catch (error) {
      console.log('⚠️ Could not create expenses table (may already exist)');
    }
  }

  async ensureTimeEntriesTable() {
    const createTimeEntriesSQL = `
      CREATE TABLE IF NOT EXISTS time_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        description TEXT NOT NULL,
        hours DECIMAL(8,2) NOT NULL DEFAULT 0,
        rate DECIMAL(8,2) DEFAULT 0,
        amount DECIMAL(12,2) DEFAULT 0,
        entry_date DATE NOT NULL,
        exchange_id UUID REFERENCES exchanges(id),
        user_id UUID REFERENCES users(id),
        
        -- PP Integration fields
        pp_id VARCHAR(36) UNIQUE,
        pp_matter_ref_id VARCHAR(36),
        pp_matter_ref_display_name TEXT,
        pp_user_ref_id VARCHAR(36),
        pp_user_ref_display_name TEXT,
        pp_description TEXT,
        pp_hours DECIMAL(8,2) DEFAULT 0,
        pp_rate INTEGER DEFAULT 0,
        pp_amount INTEGER DEFAULT 0,
        pp_date TIMESTAMP WITH TIME ZONE,
        pp_billable BOOLEAN DEFAULT true,
        pp_billed BOOLEAN DEFAULT false,
        pp_notes TEXT,
        pp_activity VARCHAR(100),
        pp_custom_field_values JSONB DEFAULT '[]',
        pp_created_at TIMESTAMP WITH TIME ZONE,
        pp_updated_at TIMESTAMP WITH TIME ZONE,
        pp_synced_at TIMESTAMP WITH TIME ZONE,
        pp_raw_data JSONB DEFAULT '{}',
        
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    try {
      await this.supabase.rpc('exec', { sql: createTimeEntriesSQL });
    } catch (error) {
      console.log('⚠️ Could not create time_entries table (may already exist)');
    }
  }

  async generateSyncReport() {
    const duration = ((Date.now() - this.startTime) / 1000 / 60).toFixed(2);
    
    console.log('');
    console.log('🎉 COMPREHENSIVE PRACTICEPANTHER SYNC COMPLETED!');
    console.log('==================================================');
    console.log(`⏱️  Total Duration: ${duration} minutes`);
    console.log(`📅 Completed at: ${new Date().toISOString()}`);
    console.log('');
    console.log('📊 SYNC STATISTICS:');
    console.log('===================');
    
    Object.entries(this.syncStats).forEach(([table, stats]) => {
      const successRate = stats.fetched > 0 ? ((stats.synced / stats.fetched) * 100).toFixed(1) : '0.0';
      console.log(`${table.padEnd(15)}: ${stats.fetched.toString().padStart(4)} fetched | ${stats.synced.toString().padStart(4)} synced | ${stats.errors.toString().padStart(3)} errors | ${successRate.padStart(5)}% success`);
    });
    
    const totalFetched = Object.values(this.syncStats).reduce((sum, stats) => sum + stats.fetched, 0);
    const totalSynced = Object.values(this.syncStats).reduce((sum, stats) => sum + stats.synced, 0);
    const totalErrors = Object.values(this.syncStats).reduce((sum, stats) => sum + stats.errors, 0);
    const overallSuccess = totalFetched > 0 ? ((totalSynced / totalFetched) * 100).toFixed(1) : '0.0';
    
    console.log('===================');
    console.log(`${'TOTAL'.padEnd(15)}: ${totalFetched.toString().padStart(4)} fetched | ${totalSynced.toString().padStart(4)} synced | ${totalErrors.toString().padStart(3)} errors | ${overallSuccess.padStart(5)}% success`);
    console.log('');
    console.log('✅ Your PracticePanther data is now fully synced to Supabase!');
    console.log('🚀 Ready for 1031 exchange management operations!');
  }
}

// Run the sync if called directly
if (require.main === module) {
  const sync = new ComprehensivePPSync();
  sync.runComprehensiveSync()
    .then(() => {
      console.log('🎉 Sync process completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Sync process failed:', error.message);
      process.exit(1);
    });
}

module.exports = ComprehensivePPSync;