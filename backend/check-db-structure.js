require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 CHECKING DATABASE STRUCTURE FOR PRACTICEPANTHER INTEGRATION\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Required tables for PP integration
const requiredTables = [
  'people',
  'exchanges', 
  'exchange_participants',
  'tasks',
  'task_templates',
  'documents',
  'document_templates',
  'messages',
  'chat_rooms',
  'alerts',
  'audit_logs',
  'oauth_tokens',
  'practice_partner_syncs',
  'admin_settings',
  'email_templates',
  'system_alerts',
  'report_templates'
];

// Required columns for PP integration
const requiredColumns = {
  people: [
    'id', 'email', 'first_name', 'last_name', 'phone', 'company',
    'role', 'is_user', 'is_active', 'pp_contact_id', 'pp_data', 'source', 'last_sync_at'
  ],
  exchanges: [
    'id', 'name', 'description', 'client_id', 'coordinator_id', 'status', 'priority',
    'exchange_type', 'property_sold_address', 'property_sold_value', 'property_bought_address',
    'property_bought_value', 'exchange_value', 'start_date', 'completion_date',
    'forty_five_day_deadline', 'one_eighty_day_deadline', 'pp_matter_id', 'pp_data', 'last_sync_at'
  ],
  tasks: [
    'id', 'exchange_id', 'title', 'description', 'status', 'priority', 'assigned_to',
    'due_date', 'pp_task_id', 'pp_data'
  ],
  oauth_tokens: [
    'id', 'provider', 'access_token', 'refresh_token', 'token_type', 'expires_at',
    'scope', 'is_active', 'last_used_at'
  ]
};

async function checkDatabaseStructure() {
  console.log('📋 Checking required tables...\n');
  
  const tableStatus = {};
  
  for (const table of requiredTables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        tableStatus[table] = { exists: false, error: error.message };
      } else {
        tableStatus[table] = { exists: true, accessible: true };
      }
    } catch (err) {
      tableStatus[table] = { exists: false, error: err.message };
    }
  }
  
  // Display table status
  console.log('📊 TABLE STATUS:');
  console.log('='.repeat(60));
  
  let missingTables = [];
  let existingTables = [];
  
  for (const [table, status] of Object.entries(tableStatus)) {
    if (status.exists) {
      console.log(`✅ ${table.padEnd(25)} - Accessible`);
      existingTables.push(table);
    } else {
      console.log(`❌ ${table.padEnd(25)} - Missing (${status.error})`);
      missingTables.push(table);
    }
  }
  
  console.log('\n📋 Checking required columns...\n');
  
  // Check columns for key tables
  for (const [table, requiredCols] of Object.entries(requiredColumns)) {
    if (tableStatus[table]?.exists) {
      console.log(`🔍 Checking columns for ${table}:`);
      
      try {
        const { data, error } = await supabase
          .from(table)
          .select(requiredCols.join(','))
          .limit(1);
        
        if (error) {
          console.log(`  ❌ Error accessing columns: ${error.message}`);
        } else {
          console.log(`  ✅ All required columns accessible`);
        }
      } catch (err) {
        console.log(`  ❌ Error: ${err.message}`);
      }
    }
  }
  
  // Check PP-specific functionality
  console.log('\n🔍 Checking PracticePanther integration...\n');
  
  // Check if we have PP data fields
  try {
    const { data: peopleSample, error: peopleError } = await supabase
      .from('people')
      .select('pp_contact_id, pp_data, source')
      .limit(1);
    
    if (peopleError) {
      console.log('❌ PP fields in people table:', peopleError.message);
    } else {
      console.log('✅ PP fields in people table: Accessible');
    }
  } catch (err) {
    console.log('❌ Error checking PP fields:', err.message);
  }
  
  try {
    const { data: exchangesSample, error: exchangesError } = await supabase
      .from('exchanges')
      .select('pp_matter_id, pp_data')
      .limit(1);
    
    if (exchangesError) {
      console.log('❌ PP fields in exchanges table:', exchangesError.message);
    } else {
      console.log('✅ PP fields in exchanges table: Accessible');
    }
  } catch (err) {
    console.log('❌ Error checking PP fields:', err.message);
  }
  
  // Check OAuth tokens
  try {
    const { data: tokens, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', 'practicepanther')
      .eq('is_active', true);
    
    if (tokenError) {
      console.log('❌ OAuth tokens table:', tokenError.message);
    } else {
      console.log(`✅ OAuth tokens: ${tokens?.length || 0} active tokens`);
    }
  } catch (err) {
    console.log('❌ Error checking OAuth tokens:', err.message);
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(60));
  console.log(`✅ Existing tables: ${existingTables.length}/${requiredTables.length}`);
  console.log(`❌ Missing tables: ${missingTables.length}`);
  
  if (missingTables.length > 0) {
    console.log('\n❌ MISSING TABLES:');
    missingTables.forEach(table => console.log(`  - ${table}`));
    console.log('\n🔧 ACTION REQUIRED:');
    console.log('Run the SUPABASE_SETUP_COMPLETE.sql script to create missing tables');
  } else {
    console.log('\n🎉 DATABASE STRUCTURE IS READY FOR PRACTICEPANTHER!');
    console.log('All required tables and columns are present.');
  }
  
  // Check if we need to run the setup script
  if (missingTables.length > 0) {
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Copy the SUPABASE_SETUP_COMPLETE.sql script');
    console.log('2. Go to Supabase Dashboard → SQL Editor');
    console.log('3. Paste and run the script');
    console.log('4. Verify all tables are created');
  } else {
    console.log('\n🚀 READY TO SYNC:');
    console.log('Your database structure is complete and ready for PracticePanther data sync!');
  }
}

checkDatabaseStructure(); 