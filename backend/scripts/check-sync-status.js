#!/usr/bin/env node

/**
 * CHECK SYNC STATUS - Simple verification of synced data
 */

require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

async function checkSyncStatus() {
  console.log('📊 CHECKING SYNC STATUS');
  console.log('=======================');
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const tables = ['users', 'contacts', 'exchanges', 'tasks', 'invoices', 'expenses'];
    
    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`❌ ${table.padEnd(12)}: Error - ${error.message}`);
        } else {
          console.log(`✅ ${table.padEnd(12)}: ${(count || 0).toLocaleString().padStart(6)} records`);
        }
        
      } catch (err) {
        console.log(`❌ ${table.padEnd(12)}: Error - ${err.message}`);
      }
    }
    
    // Check users with PP data
    try {
      const { count: usersWithPP } = await supabase
        .from('users')
        .select('pp_user_id', { count: 'exact', head: true })
        .not('pp_user_id', 'is', null);
      
      console.log(`\n🔗 PP Integration:`);
      console.log(`   Users with PP ID: ${usersWithPP || 0}`);
      
    } catch (err) {
      console.log(`\n❌ PP Integration check failed: ${err.message}`);
    }
    
    console.log('\n✅ Sync status check completed!');
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
  }
}

checkSyncStatus();