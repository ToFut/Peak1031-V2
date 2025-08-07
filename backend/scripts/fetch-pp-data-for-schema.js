/**
 * Fetch PracticePanther data and generate SQL for ppData schema
 * 
 * This script will:
 * 1. Fetch all data from PracticePanther API
 * 2. Show you what data we have
 * 3. Generate SQL INSERT statements for your existing ppData schema
 */

const PPTokenManager = require('../services/ppTokenManager');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

class PPDataFetcher {
  constructor() {
    this.tokenManager = new PPTokenManager();
    this.baseURL = 'https://app.practicepanther.com/api/v2';
  }

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

  async makeRequest(endpoint, params = {}) {
    const token = await this.getToken();
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      params: {
        limit: 50, // Smaller batches to avoid timeouts
        ...params
      }
    };

    try {
      const response = await axios.get(`${this.baseURL}/${endpoint}`, config);
      return response.data || [];
    } catch (error) {
      if (error.response?.status === 404) {
        console.log(`⚠️ Endpoint ${endpoint} not found (404) - skipping`);
        return [];
      }
      console.error(`❌ Error fetching ${endpoint}:`, error.message);
      throw error;
    }
  }

  async fetchData(endpoint, maxRecords = 1000) {
    console.log(`📥 Fetching ${endpoint} data...`);
    let allData = [];
    let page = 1;
    let hasMore = true;

    while (hasMore && allData.length < maxRecords) {
      try {
        const data = await this.makeRequest(endpoint, { page, limit: 50 });

        if (Array.isArray(data) && data.length > 0) {
          allData = allData.concat(data);
          console.log(`   📄 Page ${page}: ${data.length} records (Total: ${allData.length})`);
          
          hasMore = data.length === 50;
          page++;
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`❌ Error on page ${page}:`, error.message);
        hasMore = false;
      }
    }

    console.log(`✅ Fetched ${allData.length} ${endpoint} records\n`);
    return allData;
  }

  generateInsertSQL(tableName, data) {
    if (!data || data.length === 0) {
      return `-- No data for ${tableName}\n`;
    }

    let sql = `-- Insert data into "ppData".${tableName}\n`;
    sql += `TRUNCATE "ppData".${tableName};\n\n`;

    // Generate INSERT statements in batches
    const batchSize = 100;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);
      
      sql += `INSERT INTO "ppData".${tableName} (id, display_name, email, first_name, last_name, status, pp_raw_data, pp_synced_at, created_at, updated_at) VALUES\n`;
      
      const values = batch.map(item => {
        const displayName = (item.display_name || '').replace(/'/g, "''");
        const email = (item.email || '').replace(/'/g, "''");
        const firstName = (item.first_name || '').replace(/'/g, "''");
        const lastName = (item.last_name || '').replace(/'/g, "''");
        const status = (item.status || '').replace(/'/g, "''");
        const rawData = JSON.stringify(item).replace(/'/g, "''");
        const now = new Date().toISOString();
        
        return `  ('${item.id}', '${displayName}', '${email}', '${firstName}', '${lastName}', '${status}', '${rawData}', '${now}', '${now}', '${now}')`;
      }).join(',\n');
      
      sql += values + ';\n\n';
    }

    return sql;
  }
}

async function main() {
  console.log('🚀 Fetching PracticePanther Data for ppData Schema');
  console.log('==================================================\n');

  const fetcher = new PPDataFetcher();
  const allData = {};
  let totalRecords = 0;

  try {
    // Check PP token first
    await fetcher.getToken();
    console.log('✅ PracticePanther token verified\n');

    // Fetch data from available endpoints
    const endpoints = [
      'contacts',
      'matters', 
      'tasks',
      'invoices',
      'expenses',
      'users'
    ];

    for (const endpoint of endpoints) {
      try {
        const data = await fetcher.fetchData(endpoint, 1000); // Limit to 1000 records per type
        allData[endpoint] = data;
        totalRecords += data.length;
      } catch (error) {
        console.error(`Failed to fetch ${endpoint}:`, error.message);
        allData[endpoint] = [];
      }
    }

    // Summary
    console.log('📊 Data Summary:');
    console.log('================');
    for (const [endpoint, data] of Object.entries(allData)) {
      console.log(`${endpoint.padEnd(15)} - ${data.length} records`);
    }
    console.log(`\nTotal: ${totalRecords} records\n`);

    // Generate SQL file
    let sqlContent = '-- PracticePanther Data for ppData Schema\n';
    sqlContent += `-- Generated on ${new Date().toISOString()}\n`;
    sqlContent += `-- Total records: ${totalRecords}\n\n`;

    for (const [endpoint, data] of Object.entries(allData)) {
      if (data.length > 0) {
        console.log(`📝 Generating SQL for ${endpoint}...`);
        sqlContent += fetcher.generateInsertSQL(endpoint, data);
        sqlContent += '\n';
      }
    }

    // Save SQL file
    const sqlFilePath = path.join(__dirname, '../data/ppdata-insert.sql');
    
    // Create data directory if it doesn't exist
    const dataDir = path.dirname(sqlFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    fs.writeFileSync(sqlFilePath, sqlContent);
    console.log(`✅ SQL file created: ${sqlFilePath}`);

    // Also save as JSON for reference
    const jsonFilePath = path.join(__dirname, '../data/ppdata-raw.json');
    fs.writeFileSync(jsonFilePath, JSON.stringify(allData, null, 2));
    console.log(`✅ JSON file created: ${jsonFilePath}`);

    console.log('\n🎉 Complete! Next steps:');
    console.log('1. Review the generated SQL file');
    console.log('2. Run the SQL in your Supabase SQL editor to populate ppData schema');
    console.log(`3. Total ${totalRecords} records ready to import`);

    // Show sample data
    console.log('\n📋 Sample data structure:');
    for (const [endpoint, data] of Object.entries(allData)) {
      if (data.length > 0) {
        console.log(`\n${endpoint.toUpperCase()}:`);
        const sample = data[0];
        console.log(`  ID: ${sample.id}`);
        console.log(`  Display Name: ${sample.display_name || 'N/A'}`);
        console.log(`  Email: ${sample.email || 'N/A'}`);
        if (sample.status) console.log(`  Status: ${sample.status}`);
        console.log(`  Fields: ${Object.keys(sample).length} total`);
      }
    }

  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    console.error(error.stack);
  }

  console.log('\n✨ Script complete!');
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };