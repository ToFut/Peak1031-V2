#!/usr/bin/env node

/**
 * Check what tables exist in the Supabase database
 */

const supabaseService = require('./services/supabase');

async function checkTables() {
  console.log('🔍 Checking what tables exist in the database...\n');

  try {
    // Try to query information_schema to see all tables
    const { data: tables, error } = await supabaseService.client
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      console.log('❌ Could not query information_schema, trying direct table checks...\n');
      
      // Try checking specific tables we expect
      const tablesToCheck = [
        'notifications',
        'users', 
        'exchanges',
        'invitations',
        'messages',
        'contacts',
        'exchange_participants'
      ];

      for (const tableName of tablesToCheck) {
        try {
          const { data, error: tableError } = await supabaseService.client
            .from(tableName)
            .select('*')
            .limit(1);
            
          if (tableError) {
            console.log(`❌ Table '${tableName}': ${tableError.message}`);
          } else {
            console.log(`✅ Table '${tableName}': EXISTS (${data?.length || 0} sample rows)`);
          }
        } catch (e) {
          console.log(`❌ Table '${tableName}': ${e.message}`);
        }
      }
    } else {
      console.log('✅ Found the following tables:');
      tables.forEach((table, i) => {
        console.log(`   ${i + 1}. ${table.table_name}`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to check tables:', error.message);
  }
}

checkTables();