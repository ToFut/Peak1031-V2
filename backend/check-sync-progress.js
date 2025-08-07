const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkSyncProgress() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  console.log('📝 SYNC PROGRESS - Recent Activity:\n');
  
  // Get recent sync activities from audit logs
  const { data: logs } = await supabase
    .from('audit_logs')
    .select('action, details, created_at')
    .ilike('action', '%sync%')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (logs && logs.length > 0) {
    console.log('🕒 RECENT SYNC ACTIVITIES:');
    logs.forEach((log, index) => {
      const timeAgo = Math.floor((Date.now() - new Date(log.created_at).getTime()) / 1000);
      console.log(`\n${index + 1}. ${timeAgo}s ago: ${log.action}`);
      
      if (log.details) {
        const details = typeof log.details === 'object' ? log.details : {};
        
        if (details.sync_strategy) {
          console.log(`   Strategy: ${details.sync_strategy}`);
        }
        
        if (details.total_synced !== undefined) {
          console.log(`   Total synced: ${details.total_synced} items`);
        }
        
        if (details.total_errors !== undefined) {
          console.log(`   Errors: ${details.total_errors}`);
        }
        
        if (details.sync_duration) {
          console.log(`   Duration: ${details.sync_duration}`);
        }
        
        if (details.results) {
          console.log('   Results:');
          if (details.results.contacts) {
            console.log(`     📧 Contacts: ${details.results.contacts.synced} synced, ${details.results.contacts.errors} errors (${details.results.contacts.strategy || 'unknown'} sync)`);
          }
          if (details.results.matters) {
            console.log(`     ⚖️  Matters: ${details.results.matters.synced} synced, ${details.results.matters.errors} errors (${details.results.matters.strategy || 'unknown'} sync)`);
          }
          if (details.results.tasks) {
            console.log(`     📋 Tasks: ${details.results.tasks.synced} synced, ${details.results.tasks.errors} errors (${details.results.tasks.strategy || 'unknown'} sync)`);
          }
        }
        
        if (details.error) {
          console.log(`   ❌ Error: ${details.error}`);
        }
        
        if (details.triggered_by) {
          console.log(`   👤 Triggered by: ${details.triggered_by}`);
        }
      }
    });
    
    // Show summary
    const recentSync = logs[0];
    if (recentSync && recentSync.details) {
      const details = recentSync.details;
      console.log('\n📊 LATEST SYNC SUMMARY:');
      
      if (details.total_synced !== undefined) {
        console.log(`✅ Total Items Synced: ${details.total_synced}`);
      }
      
      if (details.sync_strategy) {
        const strategy = details.sync_strategy === 'incremental' 
          ? 'INCREMENTAL (only changes)' 
          : 'FULL (all data)';
        console.log(`📈 Sync Strategy: ${strategy}`);
      }
      
      if (details.sync_duration) {
        console.log(`⏱️  Duration: ${details.sync_duration}`);
      }
    }
    
  } else {
    console.log('❌ No sync activity found in audit logs');
    console.log('💡 The sync may still be in progress...');
  }
}

checkSyncProgress();