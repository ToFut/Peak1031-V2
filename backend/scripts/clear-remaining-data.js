/**
 * Clear remaining data with foreign key constraint handling
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function clearRemainingData() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  console.log('🧹 Clearing Remaining Data with Foreign Key Handling');
  console.log('====================================================\n');

  try {
    // Check contacts table
    console.log('📋 Checking contacts table...');
    const { count: contactCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });

    if (contactCount > 0) {
      console.log(`   Found ${contactCount} contacts to clear`);
      
      // Clear contacts now that users are gone
      const { error: contactError } = await supabase
        .from('contacts')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (contactError) {
        console.log(`   ❌ Failed to clear contacts: ${contactError.message}`);
      } else {
        console.log(`   ✅ Cleared ${contactCount} contacts`);
      }
    } else {
      console.log(`   ✅ Contacts table already empty`);
    }

    // List actual tables in database
    console.log('\n📋 Checking what tables actually exist...');
    
    // Try to query a few key tables to see their status
    const tablesToCheck = [
      'contacts',
      'exchanges', 
      'tasks',
      'users',
      'messages',
      'documents',
      'invoices',
      'expenses',
      'notes',
      'audit_logs'
    ];

    let totalRemainingRows = 0;

    for (const tableName of tablesToCheck) {
      try {
        const { count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        console.log(`   ${tableName.padEnd(20)} - ${count || 0} rows`);
        totalRemainingRows += (count || 0);
      } catch (error) {
        console.log(`   ${tableName.padEnd(20)} - not accessible or doesn't exist`);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total remaining rows: ${totalRemainingRows}`);
    
    if (totalRemainingRows === 0) {
      console.log('\n🎉 SUCCESS! Your database is now completely clean!');
      console.log('   ✅ All data removed');
      console.log('   ✅ Table structures preserved');
      console.log('   ✅ Ready for fresh data import');
    } else {
      console.log('\n⚠️ Some data still remains - may need manual cleanup');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n✨ Cleanup complete!');
}

// Run if called directly
if (require.main === module) {
  clearRemainingData();
}

module.exports = { clearRemainingData };