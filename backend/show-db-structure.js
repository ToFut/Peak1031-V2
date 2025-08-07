const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function showDatabaseStructure() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    console.log('📊 DATABASE STRUCTURE OVERVIEW');
    console.log('================================\n');
    
    // Get all tables using a simpler query
    const { data: allTables, error: tablesError } = await supabase
      .from('audit_logs')
      .select('id')
      .limit(1);
    
    // List known tables
    const coreTables = [
      'users',
      'exchanges', 
      'contacts',
      'documents',
      'messages',
      'tasks',
      'exchange_contacts',
      'exchange_users',
      'exchange_documents'
    ];
    
    const ppTables = [
      'pp_contacts',
      'pp_tasks',
      'pp_invoices',
      'pp_expenses',
      'pp_users',
      'pp_notes',
      'pp_matters'
    ];
    
    const systemTables = [
      'audit_logs',
      'oauth_tokens',
      'sync_logs',
      'settings'
    ];
    
    console.log('1️⃣ CORE BUSINESS TABLES:');
    console.log('---------------------------');
    coreTables.forEach(t => console.log(`   • ${t}`));
    
    console.log('\n2️⃣ PRACTICEPANTHER SYNC TABLES (7 tables):');
    console.log('---------------------------------------------');
    ppTables.forEach(t => console.log(`   • ${t}`));
    
    console.log('\n3️⃣ SYSTEM/ADMIN TABLES:');
    console.log('---------------------------');
    systemTables.forEach(t => console.log(`   • ${t}`));
    
    // Check if PP tables exist and get counts
    console.log('\n📈 PracticePanther Table Status:');
    console.log('-----------------------------------');
    
    for (const table of ppTables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(`   ✅ ${table}: ${count || 0} records`);
        } else {
          console.log(`   ❌ ${table}: Not created yet`);
        }
      } catch (e) {
        console.log(`   ❌ ${table}: Not created yet`);
      }
    }
    
    // Show sample PP data structure for contacts
    console.log('\n📋 Sample PP_CONTACTS Table Structure:');
    console.log('----------------------------------------');
    const { data: sampleContact, error: contactError } = await supabase
      .from('pp_contacts')
      .select('*')
      .limit(1);
    
    if (!contactError && sampleContact && sampleContact.length > 0) {
      const fields = Object.keys(sampleContact[0]);
      console.log('Fields in pp_contacts table:');
      fields.forEach(field => {
        const value = sampleContact[0][field];
        const type = value === null ? 'NULL' : typeof value;
        console.log(`   • ${field} (${type})`);
      });
    } else {
      console.log('Fields defined in migration:');
      console.log('   • pp_id (VARCHAR) - PracticePanther ID');
      console.log('   • account_ref_id (VARCHAR) - Account reference');
      console.log('   • display_name (TEXT)');
      console.log('   • first_name, middle_name, last_name (TEXT)');
      console.log('   • phone_mobile, phone_home, phone_work, phone_fax (TEXT)');
      console.log('   • email (TEXT)');
      console.log('   • notes (TEXT)');
      console.log('   • custom_field_values (JSONB)');
      console.log('   • synced_at, created_at, updated_at (TIMESTAMP)');
    }
    
    console.log('\n🔄 Data Flow:');
    console.log('---------------');
    console.log('1. PracticePanther API → Our Database (pp_* tables)');
    console.log('2. Incremental sync every few hours (only changes)');
    console.log('3. Manual sync available in Admin Dashboard');
    console.log('4. 7 PP tables syncing: contacts, tasks, invoices, expenses, users, notes, matters');
    
    console.log('\n📊 Total Database Tables: ~20 tables');
    console.log('   • 9 Core business tables');
    console.log('   • 7 PracticePanther sync tables');
    console.log('   • 4 System/admin tables');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

showDatabaseStructure();