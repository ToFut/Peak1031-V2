/**
 * Comprehensive PracticePanther Data Sync Service
 * 
 * Fetches all PP data and maps it to the comprehensive optimized schema
 * with ALL PP fields properly stored in the main public schema tables
 */

const { createClient } = require('@supabase/supabase-js');
const PPTokenManager = require('./ppTokenManager');
const axios = require('axios');
require('dotenv').config();

class ComprehensivePPSyncService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
    );
    this.tokenManager = new PPTokenManager();
    this.baseURL = 'https://app.practicepanther.com/api/v2';
  }

  /**
   * Get valid PP access token
   */
  async getToken() {
    try {
      const token = await this.tokenManager.getValidAccessToken();
      if (!token) {
        throw new Error('No valid PracticePanther token available');
      }
      return token;
    } catch (error) {
      console.error('❌ Error getting PP token:', error.message);
      throw error;
    }
  }

  /**
   * Make authenticated request to PP API
   */
  async makeRequest(endpoint, params = {}) {
    const token = await this.getToken();
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      params: {
        limit: 100, // Max per page
        ...params
      }
    };

    try {
      const response = await axios.get(`${this.baseURL}/${endpoint}`, config);
      return response.data || [];
    } catch (error) {
      console.error(`❌ Error fetching ${endpoint}:`, error.message);
      if (error.response?.status === 401) {
        console.log('🔄 Token may be expired, attempting refresh...');
        await this.tokenManager.refreshToken();
        // Retry once with new token
        const newToken = await this.getToken();
        config.headers.Authorization = `Bearer ${newToken}`;
        const retryResponse = await axios.get(`${this.baseURL}/${endpoint}`, config);
        return retryResponse.data || [];
      }
      throw error;
    }
  }

  /**
   * Fetch all data from a paginated PP endpoint
   */
  async fetchAllPages(endpoint) {
    console.log(`📥 Fetching all data from ${endpoint}...`);
    let allData = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const data = await this.makeRequest(endpoint, { 
          page,
          limit: 100 
        });

        if (Array.isArray(data) && data.length > 0) {
          allData = allData.concat(data);
          console.log(`   📄 Page ${page}: ${data.length} records (Total: ${allData.length})`);
          
          // Check if we got less than the limit (indicates last page)
          hasMore = data.length === 100;
          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`❌ Error fetching page ${page} of ${endpoint}:`, error.message);
        hasMore = false;
      }
    }

    console.log(`✅ Fetched ${allData.length} total records from ${endpoint}`);
    return allData;
  }

  /**
   * Map PP contact to comprehensive contacts table structure
   */
  mapContact(ppContact) {
    const now = new Date().toISOString();
    
    return {
      // Core identity fields
      first_name: ppContact.first_name || null,
      last_name: ppContact.last_name || null,
      display_name: ppContact.display_name || `${ppContact.first_name || ''} ${ppContact.last_name || ''}`.trim() || null,
      email: ppContact.email || null,

      // Rich contact information
      phone_primary: ppContact.phone_mobile || ppContact.phone_work || ppContact.phone_home || null,
      phone_mobile: ppContact.phone_mobile || null,
      phone_work: ppContact.phone_work || null,
      phone_home: ppContact.phone_home || null,
      phone_fax: ppContact.phone_fax || null,

      // Business context
      company: ppContact.company || null,

      // COMPLETE PP CONTACT INTEGRATION (20+ fields)
      pp_id: ppContact.id,
      pp_account_ref_id: ppContact.account_ref?.id || null,
      pp_account_ref_display_name: ppContact.account_ref?.display_name || null,
      pp_is_primary_contact: ppContact.is_primary_contact || false,
      pp_display_name: ppContact.display_name || null,
      pp_first_name: ppContact.first_name || null,
      pp_middle_name: ppContact.middle_name || null,
      pp_last_name: ppContact.last_name || null,
      pp_phone_mobile: ppContact.phone_mobile || null,
      pp_phone_work: ppContact.phone_work || null,
      pp_email: ppContact.email || null,
      pp_notes: ppContact.notes || null,
      pp_custom_field_values: ppContact.custom_field_values || [],
      pp_company: ppContact.company || null,
      pp_raw_data: ppContact, // Complete PP API response
      pp_synced_at: now,
      pp_created_at: ppContact.created_at || null,
      pp_updated_at: ppContact.updated_at || null,

      // Metadata
      tags: [],
      importance_score: 50,
      is_active: true,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Map PP matter to comprehensive exchanges table structure
   */
  mapMatter(ppMatter) {
    const now = new Date().toISOString();
    
    // Extract custom field values for mapping to specific columns
    const customFields = ppMatter.custom_field_values || [];
    const getCustomField = (fieldName) => {
      const field = customFields.find(f => f.field_name === fieldName || f.name === fieldName);
      return field ? field.value : null;
    };

    return {
      // Core exchange identity
      exchange_number: ppMatter.number?.toString() || `PP-${ppMatter.id}`,
      name: ppMatter.display_name || `Exchange ${ppMatter.number || ppMatter.id}`,
      exchange_type: getCustomField('TYPE OF EXCHANGE') || getCustomField('Exchange Type') || 'simultaneous',

      // Exchange-specific chat system
      exchange_chat_id: null, // Will be auto-generated

      // COMPLETE PP MATTER INTEGRATION (15+ fields)
      pp_matter_id: ppMatter.id,
      pp_account_ref_id: ppMatter.account_ref?.id || null,
      pp_number: ppMatter.number || null,
      pp_display_name: ppMatter.display_name || null,
      pp_matter_status: ppMatter.status || null,
      pp_practice_area: ppMatter.practice_area || null,
      pp_responsible_attorney: ppMatter.responsible_attorney || null,
      pp_opened_date: ppMatter.opened_date || null,
      pp_closed_date: ppMatter.closed_date || null,
      pp_billing_method: ppMatter.billing_method || null,
      pp_assigned_to_users: ppMatter.assigned_to_users || [],
      pp_custom_field_values: ppMatter.custom_field_values || [],
      pp_raw_data: ppMatter, // Complete PP API response
      pp_synced_at: now,
      pp_created_at: ppMatter.created_at || null,
      pp_updated_at: ppMatter.updated_at || null,

      // PP Custom Fields - Match user's example data structure
      rate: getCustomField('RATE') || getCustomField('Rate'),
      tags: ppMatter.tags || [],
      assigned_to_users: ppMatter.assigned_to_users || [],
      statute_of_limitation_date: getCustomField('STATUTE OF LIMITATION DATE') ? new Date(getCustomField('STATUTE OF LIMITATION DATE')) : null,
      
      // Banking and Financial Info
      bank: getCustomField('BANK') || getCustomField('Bank'),
      
      // Relinquished Property Information
      rel_property_city: getCustomField('REL PROPERTY CITY') || getCustomField('Relinquished Property City'),
      rel_property_state: getCustomField('REL PROPERTY STATE') || getCustomField('Relinquished Property State'),
      rel_property_zip: getCustomField('REL PROPERTY ZIP') || getCustomField('Relinquished Property Zip'),
      rel_property_address: getCustomField('REL PROPERTY ADDRESS') || getCustomField('Relinquished Property Address'),
      rel_apn: getCustomField('REL APN') || getCustomField('Relinquished APN'),
      rel_escrow_number: getCustomField('REL ESCROW #') || getCustomField('Relinquished Escrow Number'),
      rel_value: getCustomField('REL VALUE') ? parseFloat(getCustomField('REL VALUE').toString().replace(/[$,]/g, '')) : null,
      rel_contract_date: getCustomField('REL CONTRACT DATE') ? new Date(getCustomField('REL CONTRACT DATE')) : null,
      
      // Key Exchange Dates
      close_of_escrow_date: getCustomField('CLOSE OF ESCROW DATE') ? new Date(getCustomField('CLOSE OF ESCROW DATE')) : null,
      day_45: getCustomField('45 DAY') || getCustomField('45DAY') ? new Date(getCustomField('45 DAY') || getCustomField('45DAY')) : null,
      day_180: getCustomField('180 DAY') || getCustomField('180DAY') ? new Date(getCustomField('180 DAY') || getCustomField('180DAY')) : null,
      
      // Financial Information
      proceeds: getCustomField('PROCEEDS') ? parseFloat(getCustomField('PROCEEDS').toString().replace(/[$,]/g, '')) : null,
      
      // Client Information
      client_vesting: getCustomField('CLIENT VESTING') || getCustomField('Client Vesting'),
      type_of_exchange: getCustomField('TYPE OF EXCHANGE') || getCustomField('Exchange Type'),
      
      // Buyer Information
      buyer_1_name: getCustomField('BUYER 1 NAME') || getCustomField('Buyer 1 Name'),
      buyer_2_name: getCustomField('BUYER 2 NAME') || getCustomField('Buyer 2 Name'),
      
      // Replacement Property 1 Information
      rep_1_city: getCustomField('REP 1 CITY') || getCustomField('Replacement 1 City'),
      rep_1_state: getCustomField('REP 1 STATE') || getCustomField('Replacement 1 State'),
      rep_1_zip: getCustomField('REP 1 ZIP') || getCustomField('Replacement 1 Zip'),
      rep_1_property_address: getCustomField('REP 1 PROPERTY ADDRESS') || getCustomField('Replacement 1 Address'),
      rep_1_apn: getCustomField('REP 1 APN') || getCustomField('Replacement 1 APN'),
      rep_1_escrow_number: getCustomField('REP 1 ESCROW #') || getCustomField('Replacement 1 Escrow Number'),
      rep_1_value: getCustomField('REP 1 VALUE') ? parseFloat(getCustomField('REP 1 VALUE').toString().replace(/[$,]/g, '')) : null,
      rep_1_contract_date: getCustomField('REP 1 CONTRACT DATE') ? new Date(getCustomField('REP 1 CONTRACT DATE')) : null,
      rep_1_seller_name: getCustomField('REP 1 SELLER NAME') || getCustomField('Replacement 1 Seller'),

      // Status & workflow
      status: ppMatter.status === 'Active' ? 'active' : 'pending',
      priority: 'medium',
      completion_percentage: 0,

      // Analytics & intelligence
      custom_fields: Object.fromEntries(customFields.map(f => [f.field_name || f.name, f.value])),
      estimated_fees: null,
      actual_fees: null,

      // Metadata
      is_active: true,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Map PP task to comprehensive tasks table structure
   */
  mapTask(ppTask) {
    const now = new Date().toISOString();
    
    return {
      // Core task information
      title: ppTask.title || ppTask.description || 'Untitled Task',
      description: ppTask.description || null,
      task_type: 'compliance', // Default, can be enhanced later
      category: ppTask.category || null,

      // Timeline intelligence
      due_date: ppTask.due_date || null,
      start_date: ppTask.start_date || null,
      completed_at: ppTask.completed_date || null,

      // Status & priority
      status: this.mapTaskStatus(ppTask.status),
      priority: this.mapPriority(ppTask.priority),

      // COMPLETE PP TASK INTEGRATION (10+ fields)
      pp_id: ppTask.id,
      pp_matter_ref_id: ppTask.matter_ref?.id || null,
      pp_matter_ref_name: ppTask.matter_ref?.display_name || null,
      pp_due_date: ppTask.due_date || null,
      pp_completed_date: ppTask.completed_date || null,
      pp_billable: ppTask.billable || false,
      pp_billed: ppTask.billed || false,
      pp_assigned_to_users: ppTask.assigned_to_users || [],
      pp_assigned_to_contacts: ppTask.assigned_to_contacts || [],
      pp_priority: ppTask.priority || null,
      pp_tags: ppTask.tags || [],
      pp_notes: ppTask.notes || null,
      pp_custom_field_values: ppTask.custom_field_values || [],
      pp_raw_data: ppTask, // Complete PP API response
      pp_synced_at: now,
      pp_created_at: ppTask.created_at || null,
      pp_updated_at: ppTask.updated_at || null,

      // Progress & quality
      completion_percentage: ppTask.status === 'Completed' ? 100 : 0,

      // Metadata
      is_active: true,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Map PP invoice to comprehensive invoices table structure
   */
  mapInvoice(ppInvoice) {
    const now = new Date().toISOString();
    
    return {
      // Invoice identity
      invoice_number: ppInvoice.number || `PP-${ppInvoice.id}`,
      issue_date: ppInvoice.issue_date || null,
      due_date: ppInvoice.due_date || null,

      // Status & type
      status: ppInvoice.status || 'draft',
      invoice_type: 'service',

      // Financial data
      subtotal: parseFloat(ppInvoice.subtotal || 0),
      tax_rate: parseFloat(ppInvoice.tax_rate || 0),
      tax_amount: parseFloat(ppInvoice.tax_amount || 0),
      total_amount: parseFloat(ppInvoice.total || ppInvoice.total_amount || 0),
      amount_paid: parseFloat(ppInvoice.amount_paid || 0),

      // Line items & details
      line_items: ppInvoice.line_items || [],
      time_entries: ppInvoice.time_entries || [],
      expense_items: ppInvoice.expense_items || [],

      // Payment information
      payment_terms: ppInvoice.payment_terms || null,

      // COMPLETE PP INVOICE INTEGRATION
      pp_id: ppInvoice.id,
      pp_account_ref_id: ppInvoice.account_ref?.id || null,
      pp_matter_ref_id: ppInvoice.matter_ref?.id || null,
      pp_raw_data: ppInvoice, // Complete PP API response
      pp_synced_at: now,

      // Metadata
      notes: ppInvoice.notes || null,
      custom_fields: ppInvoice.custom_fields || {},
      is_active: true,
      created_at: now,
      updated_at: now
    };
  }

  /**
   * Map PP task status to our task_status_enum
   */
  mapTaskStatus(ppStatus) {
    const statusMap = {
      'Pending': 'pending',
      'In Progress': 'in_progress',
      'Completed': 'completed',
      'Cancelled': 'cancelled',
      'On Hold': 'on_hold'
    };
    return statusMap[ppStatus] || 'pending';
  }

  /**
   * Map PP priority to our priority_enum
   */
  mapPriority(ppPriority) {
    const priorityMap = {
      'Low': 'low',
      'Normal': 'medium',
      'High': 'high',
      'Urgent': 'urgent'
    };
    return priorityMap[ppPriority] || 'medium';
  }

  /**
   * Sync all contacts from PP to comprehensive contacts table
   */
  async syncContacts() {
    console.log('\\n📧 Syncing PP Contacts to comprehensive schema...');
    try {
      const ppContacts = await this.fetchAllPages('contacts');
      
      if (!ppContacts || ppContacts.length === 0) {
        console.log('⚠️ No contacts found in PP');
        return { success: true, stored: 0 };
      }

      // Map PP contacts to our comprehensive schema
      const mappedContacts = ppContacts.map(contact => this.mapContact(contact));

      // Upsert to contacts table
      const { data, error } = await this.supabase
        .from('contacts')
        .upsert(mappedContacts, {
          onConflict: 'pp_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ Error storing contacts:', error.message);
        return { success: false, error: error.message };
      }

      console.log(`✅ Synced ${mappedContacts.length} contacts with all PP fields`);
      return { success: true, stored: mappedContacts.length };
    } catch (error) {
      console.error('❌ Failed to sync contacts:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all matters from PP to comprehensive exchanges table
   */
  async syncMatters() {
    console.log('\\n🏢 Syncing PP Matters to comprehensive exchanges...');
    try {
      const ppMatters = await this.fetchAllPages('matters');
      
      if (!ppMatters || ppMatters.length === 0) {
        console.log('⚠️ No matters found in PP');
        return { success: true, stored: 0 };
      }

      // Map PP matters to our comprehensive schema
      const mappedMatters = ppMatters.map(matter => this.mapMatter(matter));

      // Upsert to exchanges table
      const { data, error } = await this.supabase
        .from('exchanges')
        .upsert(mappedMatters, {
          onConflict: 'pp_matter_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ Error storing exchanges:', error.message);
        return { success: false, error: error.message };
      }

      console.log(`✅ Synced ${mappedMatters.length} exchanges with all PP matter fields`);
      return { success: true, stored: mappedMatters.length };
    } catch (error) {
      console.error('❌ Failed to sync matters:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all tasks from PP to comprehensive tasks table
   */
  async syncTasks() {
    console.log('\\n✅ Syncing PP Tasks to comprehensive schema...');
    try {
      const ppTasks = await this.fetchAllPages('tasks');
      
      if (!ppTasks || ppTasks.length === 0) {
        console.log('⚠️ No tasks found in PP');
        return { success: true, stored: 0 };
      }

      // Map PP tasks to our comprehensive schema
      const mappedTasks = ppTasks.map(task => this.mapTask(task));

      // Upsert to tasks table
      const { data, error } = await this.supabase
        .from('tasks')
        .upsert(mappedTasks, {
          onConflict: 'pp_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ Error storing tasks:', error.message);
        return { success: false, error: error.message };
      }

      console.log(`✅ Synced ${mappedTasks.length} tasks with all PP task fields`);
      return { success: true, stored: mappedTasks.length };
    } catch (error) {
      console.error('❌ Failed to sync tasks:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all invoices from PP to comprehensive invoices table
   */
  async syncInvoices() {
    console.log('\\n💰 Syncing PP Invoices to comprehensive schema...');
    try {
      const ppInvoices = await this.fetchAllPages('invoices');
      
      if (!ppInvoices || ppInvoices.length === 0) {
        console.log('⚠️ No invoices found in PP');
        return { success: true, stored: 0 };
      }

      // Map PP invoices to our comprehensive schema
      const mappedInvoices = ppInvoices.map(invoice => this.mapInvoice(invoice));

      // Upsert to invoices table
      const { data, error } = await this.supabase
        .from('invoices')
        .upsert(mappedInvoices, {
          onConflict: 'pp_id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error('❌ Error storing invoices:', error.message);
        return { success: false, error: error.message };
      }

      console.log(`✅ Synced ${mappedInvoices.length} invoices with all PP fields`);
      return { success: true, stored: mappedInvoices.length };
    } catch (error) {
      console.error('❌ Failed to sync invoices:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Full comprehensive sync - fetch all PP data into optimized schema
   */
  async syncAll() {
    console.log('\\n🚀 Starting comprehensive PracticePanther sync...');
    console.log('📋 Syncing ALL PP fields to optimized schema tables\\n');
    
    const startTime = Date.now();
    const results = {};

    try {
      // Check PP token first
      await this.getToken();
      console.log('✅ PracticePanther token verified\\n');

      // Sync all data types to comprehensive schema
      const syncOperations = [
        { name: 'contacts', method: this.syncContacts.bind(this), description: 'ALL PP contact fields' },
        { name: 'exchanges', method: this.syncMatters.bind(this), description: 'ALL PP matter fields + chat_id' },
        { name: 'tasks', method: this.syncTasks.bind(this), description: 'ALL PP task fields' },
        { name: 'invoices', method: this.syncInvoices.bind(this), description: 'ALL PP invoice fields' }
      ];

      for (const operation of syncOperations) {
        try {
          console.log(`🔄 ${operation.name}: ${operation.description}`);
          const result = await operation.method();
          results[operation.name] = result;
        } catch (error) {
          console.error(`❌ Failed to sync ${operation.name}:`, error.message);
          results[operation.name] = { success: false, error: error.message };
        }
      }

      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);

      // Summary
      console.log('\\n📊 Comprehensive Sync Summary:');
      console.log('================================');
      let totalRecords = 0;
      let successCount = 0;

      for (const [table, result] of Object.entries(results)) {
        const status = result.success ? '✅' : '❌';
        const count = result.stored || 0;
        totalRecords += count;
        if (result.success) successCount++;
        
        console.log(`${status} ${table.padEnd(15)} - ${count} records with ALL PP fields`);
      }

      console.log(`\\n🎯 Results: ${successCount}/${syncOperations.length} operations succeeded`);
      console.log(`📈 Total records synced: ${totalRecords}`);
      console.log(`⏱️ Duration: ${duration}s`);
      console.log('\\n🔥 All PracticePanther data now available with comprehensive field mapping!');

      return {
        success: true,
        summary: {
          operations: syncOperations.length,
          successful: successCount,
          totalRecords,
          duration: parseFloat(duration)
        },
        results
      };

    } catch (error) {
      console.error('❌ Comprehensive sync failed:', error.message);
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }

  /**
   * Get comprehensive sync status
   */
  async getSyncStatus() {
    const tables = ['contacts', 'exchanges', 'tasks', 'invoices'];
    const status = {};
    
    for (const table of tables) {
      try {
        // Count records with PP data
        const { count, error } = await this.supabase
          .from(table)
          .select('*', { count: 'exact', head: true })
          .not('pp_id', 'is', null);

        if (!error) {
          // Get latest sync time
          const { data: latestSync } = await this.supabase
            .from(table)
            .select('pp_synced_at')
            .not('pp_synced_at', 'is', null)
            .order('pp_synced_at', { ascending: false })
            .limit(1)
            .single();

          status[table] = {
            count: count || 0,
            lastSync: latestSync?.pp_synced_at || null,
            hasComprehensiveFields: true
          };
        } else {
          status[table] = {
            count: 0,
            lastSync: null,
            hasComprehensiveFields: false,
            error: error.message
          };
        }
      } catch (e) {
        status[table] = {
          count: 0,
          lastSync: null,
          hasComprehensiveFields: false,
          error: 'Table not found or no PP data'
        };
      }
    }

    return status;
  }
}

module.exports = ComprehensivePPSyncService;