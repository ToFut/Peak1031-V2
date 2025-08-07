/**
 * PracticePanther Data Sync Service - ppData Schema
 * 
 * Fetches all PP data and stores it in the dedicated ppData schema
 * This keeps PP data separate from the main application schema
 */

const { createClient } = require('@supabase/supabase-js');
const PPTokenManager = require('./ppTokenManager');
const axios = require('axios');
require('dotenv').config();

class PPDataSyncService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
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
  async fetchAllPages(endpoint, tableName = null) {
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
   * Store PP data in ppData schema tables
   */
  async storePPData(tableName, data, keyField = 'id') {
    if (!data || data.length === 0) {
      console.log(`⚠️ No data to store for ${tableName}`);
      return { success: true, stored: 0 };
    }

    console.log(`💾 Storing ${data.length} records in ppData.${tableName}...`);
    
    try {
      // Store the raw PP data with minimal transformation
      const transformedData = data.map(item => ({
        id: item.id, // Use PP ID as primary key
        pp_raw_data: item, // Store complete PP data as JSONB
        pp_synced_at: new Date().toISOString(),
        // Extract common fields for easier querying
        display_name: item.display_name,
        email: item.email,
        first_name: item.first_name,
        last_name: item.last_name,
        status: item.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Use upsert to handle duplicates based on PP ID
      const { data: result, error } = await this.supabase
        .schema('ppData')
        .from(tableName)
        .upsert(transformedData, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`❌ Error storing ppData.${tableName}:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`✅ Stored ${data.length} records in ppData.${tableName}`);
      return { success: true, stored: data.length };
    } catch (error) {
      console.error(`❌ Exception storing ppData.${tableName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all contacts from PP
   */
  async syncContacts() {
    console.log('\n📧 Syncing PP Contacts...');
    try {
      const contacts = await this.fetchAllPages('contacts');
      return await this.storePPData('contacts', contacts, 'id');
    } catch (error) {
      console.error('❌ Failed to sync contacts:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all matters from PP  
   */
  async syncMatters() {
    console.log('\n📁 Syncing PP Matters...');
    try {
      const matters = await this.fetchAllPages('matters');
      return await this.storePPData('matters', matters, 'id');
    } catch (error) {
      console.error('❌ Failed to sync matters:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all tasks from PP
   */
  async syncTasks() {
    console.log('\n✅ Syncing PP Tasks...');
    try {
      const tasks = await this.fetchAllPages('tasks');
      return await this.storePPData('tasks', tasks, 'id');
    } catch (error) {
      console.error('❌ Failed to sync tasks:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all invoices from PP
   */
  async syncInvoices() {
    console.log('\n💰 Syncing PP Invoices...');
    try {
      const invoices = await this.fetchAllPages('invoices');
      return await this.storePPData('invoices', invoices, 'id');
    } catch (error) {
      console.error('❌ Failed to sync invoices:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all expenses from PP
   */
  async syncExpenses() {
    console.log('\n💸 Syncing PP Expenses...');
    try {
      const expenses = await this.fetchAllPages('expenses');
      return await this.storePPData('expenses', expenses, 'id');
    } catch (error) {
      console.error('❌ Failed to sync expenses:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all time entries from PP
   */
  async syncTimeEntries() {
    console.log('\n⏱️ Syncing PP Time Entries...');
    try {
      const timeEntries = await this.fetchAllPages('time_entries');
      return await this.storePPData('time_entries', timeEntries, 'id');
    } catch (error) {
      console.error('❌ Failed to sync time entries:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all users from PP
   */
  async syncUsers() {
    console.log('\n👥 Syncing PP Users...');
    try {
      const users = await this.fetchAllPages('users');
      return await this.storePPData('users', users, 'id');
    } catch (error) {
      console.error('❌ Failed to sync users:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all notes from PP
   */
  async syncNotes() {
    console.log('\n📝 Syncing PP Notes...');
    try {
      const notes = await this.fetchAllPages('notes');
      return await this.storePPData('notes', notes, 'id');
    } catch (error) {
      console.error('❌ Failed to sync notes:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all documents from PP
   */
  async syncDocuments() {
    console.log('\n📄 Syncing PP Documents...');
    try {
      const documents = await this.fetchAllPages('documents');
      return await this.storePPData('documents', documents, 'id');
    } catch (error) {
      console.error('❌ Failed to sync documents:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Full sync - fetch all PP data into ppData schema
   */
  async syncAll() {
    console.log('\n🚀 Starting complete PracticePanther data sync to ppData schema...\n');
    
    const startTime = Date.now();
    const results = {};

    try {
      // Check PP token first
      await this.getToken();
      console.log('✅ PracticePanther token verified\n');

      // Sync all data types
      const syncOperations = [
        { name: 'contacts', method: this.syncContacts.bind(this) },
        { name: 'matters', method: this.syncMatters.bind(this) },
        { name: 'tasks', method: this.syncTasks.bind(this) },
        { name: 'invoices', method: this.syncInvoices.bind(this) },
        { name: 'expenses', method: this.syncExpenses.bind(this) },
        { name: 'time_entries', method: this.syncTimeEntries.bind(this) },
        { name: 'users', method: this.syncUsers.bind(this) },
        { name: 'notes', method: this.syncNotes.bind(this) },
        { name: 'documents', method: this.syncDocuments.bind(this) }
      ];

      for (const operation of syncOperations) {
        try {
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
      console.log('\n📊 Sync Summary:');
      console.log('================');
      let totalRecords = 0;
      let successCount = 0;

      for (const [table, result] of Object.entries(results)) {
        const status = result.success ? '✅' : '❌';
        const count = result.stored || 0;
        totalRecords += count;
        if (result.success) successCount++;
        
        console.log(`${status} ${table.padEnd(15)} - ${count} records`);
      }

      console.log(`\n🎯 Results: ${successCount}/${syncOperations.length} operations succeeded`);
      console.log(`📈 Total records synced: ${totalRecords}`);
      console.log(`⏱️ Duration: ${duration}s`);

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
      console.error('❌ Sync failed:', error.message);
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }

  /**
   * Get sync status from ppData schema
   */
  async getSyncStatus() {
    const tables = [
      'contacts', 'matters', 'tasks', 'invoices', 
      'expenses', 'time_entries', 'users', 'notes', 'documents'
    ];

    const status = {};
    
    for (const table of tables) {
      try {
        const { count, error } = await this.supabase
          .schema('ppData')
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (!error) {
          // Get latest sync time
          const { data: latestSync } = await this.supabase
            .schema('ppData')
            .from(table)
            .select('pp_synced_at')
            .order('pp_synced_at', { ascending: false })
            .limit(1)
            .single();

          status[table] = {
            count: count || 0,
            lastSync: latestSync?.pp_synced_at || null
          };
        } else {
          status[table] = {
            count: 0,
            lastSync: null,
            error: error.message
          };
        }
      } catch (e) {
        status[table] = {
          count: 0,
          lastSync: null,
          error: 'Table not found in ppData schema'
        };
      }
    }

    return status;
  }
}

module.exports = PPDataSyncService;