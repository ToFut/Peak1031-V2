#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verifyTableStructure() {
  console.log('🔍 Verifying current table structure for migration...\n');
  
  try {
    // Check CONTACTS table structure
    const { data: contactsSample } = await supabase.from('contacts').select('*').limit(1);
    if (contactsSample && contactsSample[0]) {
      const columns = Object.keys(contactsSample[0]);
      console.log('📊 CONTACTS table has', columns.length, 'columns');
      
      const newColumns = ['last_login_ip', 'login_attempts', 'locked_until', 'preferences'];
      const missingColumns = [];
      
      for (const col of newColumns) {
        if (!columns.includes(col)) {
          missingColumns.push(col);
        }
      }
      
      if (missingColumns.length > 0) {
        console.log('\n⚠️  Missing columns in CONTACTS:', missingColumns.join(', '));
      } else {
        console.log('\n✅ All required CONTACTS columns exist');
      }
    }
    
    // Check if problematic tables exist and are empty
    const tables = ['exchange_participants', 'messages', 'documents', 'tasks'];
    
    for (const table of tables) {
      try {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        console.log(`📊 ${table.toUpperCase()}: ${count || 0} records`);
        
        if (count === 0) {
          console.log(`   ✅ ${table} is empty - safe to recreate`);
        } else {
          console.log(`   ⚠️  ${table} has data - be careful with migration`);
        }
      } catch (err) {
        console.log(`❌ ${table.toUpperCase()}: Does not exist`);
      }
    }
    
    console.log('\n💡 Recommendation:');
    console.log('   1. Run the SQL statements manually in Supabase SQL Editor');
    console.log('   2. Add columns one by one to identify which specific line causes the error');
    console.log('   3. Start with: ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_login_ip INET;');
    
  } catch (error) {
    console.error('❌ Error checking table structure:', error.message);
  }
}

verifyTableStructure();