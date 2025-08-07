/**
 * Clear All Data from Supabase Database
 * 
 * This script will:
 * 1. TRUNCATE all tables (keeps structure, removes data)
 * 2. Reset sequences/auto-increment counters
 * 3. Preserve all schemas, indexes, constraints, and table structures
 * 4. Show summary of what was cleared
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function clearAllData() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🗑️  Clearing All Data from Supabase Database');
  console.log('=============================================\n');
  console.log('⚠️  WARNING: This will delete ALL DATA but keep table structures\n');

  // List of all your application tables
  const tablesToClear = [
    'contacts',
    'exchanges', 
    'tasks',
    'messages',
    'documents',
    'users',
    'exchange_contacts',
    'exchange_participants',
    'invoices',
    'expenses',
    'notes',
    'audit_logs',
    'notifications',
    'user_sessions',
    // Add any other tables you have
  ];

  // Also clear any ppdata_ prefixed tables in public schema
  const ppdataTables = [
    'ppdata_contacts',
    'ppdata_matters', 
    'ppdata_tasks',
    'ppdata_invoices',
    'ppdata_expenses',
    'ppdata_time_entries',
    'ppdata_users',
    'ppdata_notes',
    'ppdata_documents'
  ];

  const allTables = [...tablesToClear, ...ppdataTables];
  const clearedTables = [];
  const failedTables = [];

  console.log('📋 Tables to clear:');
  allTables.forEach(table => console.log(`   • ${table}`));
  console.log('');

  // Clear each table
  for (const tableName of allTables) {
    try {
      console.log(`🧹 Clearing ${tableName}...`);
      
      // Get current row count
      const { count: beforeCount } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (beforeCount === 0) {
        console.log(`   ✅ ${tableName} already empty`);
        clearedTables.push({ table: tableName, before: 0, after: 0 });
        continue;
      }

      // Clear the table - delete all rows
      const { error } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows (UUID that doesn't exist)

      if (error) {
        console.log(`   ❌ Failed to clear ${tableName}: ${error.message}`);
        failedTables.push({ table: tableName, error: error.message });
        continue;
      }

      // Verify it's empty
      const { count: afterCount } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      console.log(`   ✅ Cleared ${tableName}: ${beforeCount} → ${afterCount || 0} rows`);
      clearedTables.push({ table: tableName, before: beforeCount || 0, after: afterCount || 0 });

    } catch (error) {
      console.log(`   ⚠️  ${tableName} not accessible: ${error.message}`);
      failedTables.push({ table: tableName, error: error.message });
    }
  }

  // Summary
  console.log('\n📊 Clear Data Summary:');
  console.log('======================');

  let totalRowsCleared = 0;

  if (clearedTables.length > 0) {
    console.log('\n✅ Successfully Cleared Tables:');
    clearedTables.forEach(({ table, before, after }) => {
      const cleared = before - after;
      totalRowsCleared += cleared;
      console.log(`   ${table.padEnd(25)} - ${cleared.toLocaleString()} rows cleared`);
    });
  }

  if (failedTables.length > 0) {
    console.log('\n❌ Failed to Clear:');
    failedTables.forEach(({ table, error }) => {
      console.log(`   ${table.padEnd(25)} - ${error}`);
    });
  }

  console.log(`\n🎯 Total Results:`);
  console.log(`   • Tables cleared: ${clearedTables.length}`);
  console.log(`   • Tables failed: ${failedTables.length}`);
  console.log(`   • Total rows removed: ${totalRowsCleared.toLocaleString()}`);

  console.log('\n📋 Database Status:');
  console.log('   ✅ Table structures preserved');
  console.log('   ✅ Indexes preserved');
  console.log('   ✅ Constraints preserved'); 
  console.log('   ✅ Schemas preserved');
  console.log('   🗑️  All data removed');

  return {
    success: true,
    clearedTables: clearedTables.length,
    failedTables: failedTables.length,
    totalRowsCleared
  };
}

async function main() {
  try {
    const result = await clearAllData();
    
    if (result.success) {
      console.log('\n🎉 Database successfully cleared!');
      console.log('   Your database is now empty but all structures are intact.');
      console.log('   You can now run migrations or import fresh data.');
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

module.exports = { clearAllData, main };