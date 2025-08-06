#!/usr/bin/env node

/**
 * Script to check what tables actually exist in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTables() {
  console.log('🔍 Checking Supabase tables...\n');

  try {
    // Query the information schema to get all tables
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');

    if (error) {
      // Try a different approach - check known tables
      console.log('Could not query information_schema, checking known tables...\n');
      
      const tablesToCheck = [
        'users',
        'people', 
        'contacts',
        'exchanges',
        'exchange_participants',
        'tasks',
        'messages',
        'documents',
        'audit_logs'
      ];

      for (const table of tablesToCheck) {
        try {
          const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
          
          if (!error) {
            console.log(`✅ Table exists: ${table} (${count || 0} records)`);
          } else {
            console.log(`❌ Table NOT found: ${table}`);
          }
        } catch (e) {
          console.log(`❌ Table NOT found: ${table}`);
        }
      }
    } else {
      console.log('Tables in public schema:');
      tables.forEach(t => console.log(`  - ${t.table_name}`));
    }

    // Check specific tables and their structure
    console.log('\n📊 Checking table structures...\n');

    // Check if we have users or people table
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (!userError && userData) {
        console.log('✅ USERS table exists');
        console.log('   Sample columns:', Object.keys(userData[0] || {}));
      }
    } catch (e) {
      console.log('❌ USERS table not found');
    }

    try {
      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('*')
        .limit(1);
      
      if (!peopleError && peopleData) {
        console.log('✅ PEOPLE table exists');
        console.log('   Sample columns:', Object.keys(peopleData[0] || {}));
      }
    } catch (e) {
      console.log('❌ PEOPLE table not found');
    }

    // Check contacts table
    try {
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .select('*')
        .limit(1);
      
      if (!contactError && contactData) {
        console.log('✅ CONTACTS table exists');
        console.log('   Sample columns:', Object.keys(contactData[0] || {}));
      }
    } catch (e) {
      console.log('❌ CONTACTS table not found');
    }

    // Check exchanges table
    try {
      const { data: exchangeData, error: exchangeError } = await supabase
        .from('exchanges')
        .select('*')
        .limit(1);
      
      if (!exchangeError && exchangeData) {
        console.log('✅ EXCHANGES table exists');
        console.log('   Sample columns:', Object.keys(exchangeData[0] || {}));
      }
    } catch (e) {
      console.log('❌ EXCHANGES table not found');
    }

    // Check for auth schema (Supabase Auth)
    console.log('\n🔐 Checking Supabase Auth...\n');
    try {
      // Supabase Auth uses auth.users table
      const { data: authTest, error: authError } = await supabase.auth.admin.listUsers();
      
      if (!authError) {
        console.log('✅ Supabase Auth is configured');
        console.log(`   Total users: ${authTest.users.length}`);
      } else {
        console.log('⚠️  Could not access Supabase Auth (may need admin key)');
      }
    } catch (e) {
      console.log('⚠️  Could not check Supabase Auth');
    }

  } catch (error) {
    console.error('❌ Error checking tables:', error);
  }
}

// Run the check
checkTables();