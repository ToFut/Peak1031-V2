#!/usr/bin/env node

/**
 * Script to check what tables we actually have and want
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTables() {
  console.log('🔍 Checking actual table structure...\n');

  try {
    // Check each table
    const tables = ['users', 'contacts', 'people', 'exchanges'];
    
    for (const table of tables) {
      console.log(`\n📊 Checking ${table.toUpperCase()} table:`);
      
      const { data, error, count } = await supabase
        .from(table)
        .select('*', { count: 'exact' })
        .limit(1);
      
      if (error) {
        console.log(`❌ Table doesn't exist or error: ${error.message}`);
      } else {
        console.log(`✅ Table exists with ${count || 0} records`);
        if (data && data.length > 0) {
          console.log('   Columns:', Object.keys(data[0]).slice(0, 10).join(', ') + '...');
        }
      }
    }

    // Check if we're using the right structure
    console.log('\n\n❓ CURRENT SITUATION:');
    console.log('====================');
    console.log('You have:');
    console.log('- A "people" table that combines users and contacts');
    console.log('- Empty "users" table (0 records)');
    console.log('- Empty "contacts" table (0 records)');
    console.log('\nBut you WANT:');
    console.log('- Separate "users" table for authentication');
    console.log('- Separate "contacts" table for business data');
    console.log('- NO "people" table');
    
    console.log('\n🎯 SOLUTION:');
    console.log('============');
    console.log('We need to migrate data FROM the people table TO separate users and contacts tables');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkTables();