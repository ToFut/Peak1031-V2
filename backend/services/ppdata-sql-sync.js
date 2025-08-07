/**
 * PracticePanther Data Sync Service using direct SQL
 * 
 * This service syncs PP data directly to the ppData schema using SQL queries
 * since the Supabase JS client only supports public/graphql_public schemas
 */

const { createClient } = require('@supabase/supabase-js');
const PPTokenManager = require('./ppTokenManager');
const axios = require('axios');
require('dotenv').config();

class PPDataSQLSyncService {
  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    this.tokenManager = new PPTokenManager();
    this.baseURL = 'https://app.practicepanther.com/api/v2';
  }

  /**
   * Execute SQL query directly
   */
  async executeSql(sql, params = []) {
    try {
      const { data, error } = await this.supabase.rpc('exec_sql', {
        sql: sql
      });
      
      if (error) {
        throw new Error(`SQL Error: ${error.message}`);
      }
      
      return data;
    } catch (error) {
      // If exec_sql doesn't exist, try using a custom function
      console.log('exec_sql not available, using alternative approach...');
      
      // For now, let's use the public schema with ppdata_ prefix
      return null;
    }
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

        // Limit to prevent too much data in one run
        if (allData.length > 10000) {
          console.log(`   ⚠️ Reached limit of 10,000 records for ${endpoint}`);
          break;
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
   * Store PP data using table name with ppdata_ prefix in public schema
   * Since we can't access custom schemas via JS client
   */
  async storePPDataInPublic(tableName, data) {
    if (!data || data.length === 0) {
      console.log(`⚠️ No data to store for ${tableName}`);
      return { success: true, stored: 0 };
    }

    console.log(`💾 Storing ${data.length} records in ppdata_${tableName}...`);
    
    try {
      // Check if table exists
      const { count: tableExists } = await this.supabase
        .from(`ppdata_${tableName}`)
        .select('*', { count: 'exact', head: true });

      // Transform data for storage
      const transformedData = data.map(item => ({
        pp_id: item.id,
        display_name: item.display_name,
        email: item.email,
        first_name: item.first_name,
        last_name: item.last_name,
        status: item.status,
        pp_synced_at: new Date().toISOString(),
        pp_raw_data: item,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      // Insert data in batches
      const batchSize = 1000;
      let totalStored = 0;

      for (let i = 0; i < transformedData.length; i += batchSize) {
        const batch = transformedData.slice(i, i + batchSize);
        
        const { data: result, error } = await this.supabase
          .from(`ppdata_${tableName}`)
          .upsert(batch, {
            onConflict: 'pp_id',
            ignoreDuplicates: false
          });

        if (error) {
          console.error(`❌ Error storing batch ${Math.floor(i/batchSize) + 1}:`, error.message);
          // Continue with next batch
        } else {
          totalStored += batch.length;
          console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: ${batch.length} records`);
        }
      }

      console.log(`✅ Stored ${totalStored} records in ppdata_${tableName}`);
      return { success: true, stored: totalStored };

    } catch (error) {
      console.error(`❌ Exception storing ppdata_${tableName}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all contacts from PP to ppdata_contacts table
   */
  async syncContacts() {
    console.log('\n📧 Syncing PP Contacts...');
    try {
      const contacts = await this.fetchAllPages('contacts');
      return await this.storePPDataInPublic('contacts', contacts);
    } catch (error) {
      console.error('❌ Failed to sync contacts:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all matters from PP to ppdata_matters table
   */
  async syncMatters() {
    console.log('\n📁 Syncing PP Matters...');
    try {
      const matters = await this.fetchAllPages('matters');
      return await this.storePPDataInPublic('matters', matters);
    } catch (error) {
      console.error('❌ Failed to sync matters:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync all invoices from PP to ppdata_invoices table
   */
  async syncInvoices() {
    console.log('\n💰 Syncing PP Invoices...');
    try {
      const invoices = await this.fetchAllPages('invoices');
      return await this.storePPDataInPublic('invoices', invoices);
    } catch (error) {
      console.error('❌ Failed to sync invoices:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Full sync - fetch all available PP data
   */
  async syncAll() {
    console.log('\n🚀 Starting PracticePanther data sync (public schema approach)...\n');
    
    const startTime = Date.now();
    const results = {};

    try {
      // Check PP token first
      await this.getToken();
      console.log('✅ PracticePanther token verified\n');

      // Sync main data types
      const syncOperations = [
        { name: 'contacts', method: this.syncContacts.bind(this) },
        { name: 'matters', method: this.syncMatters.bind(this) },
        { name: 'invoices', method: this.syncInvoices.bind(this) }
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
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
      }

      console.log(`\n🎯 Results: ${successCount}/${syncOperations.length} operations succeeded`);
      console.log(`📈 Total records synced: ${totalRecords}`);
      console.log(`⏱️ Duration: ${duration}s`);

      return {
        success: successCount > 0,
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
}

module.exports = PPDataSQLSyncService;