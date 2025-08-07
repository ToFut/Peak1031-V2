/**
 * Sync PracticePanther data to existing ppData schema
 * 
 * This assumes you've already created the ppData schema and tables in Supabase
 */

const PPDataSyncService = require('../services/ppdata-sync');
require('dotenv').config();

async function main() {
  console.log('🚀 Syncing PracticePanther data to ppData schema');
  console.log('=================================================\n');

  try {
    // Initialize sync service
    const syncService = new PPDataSyncService();

    // Check current status
    console.log('📊 Checking current ppData schema status...\n');
    const currentStatus = await syncService.getSyncStatus();
    
    for (const [table, info] of Object.entries(currentStatus)) {
      if (info.error) {
        console.log(`⚠️  ${table.padEnd(15)} - ${info.error}`);
      } else {
        console.log(`📋 ${table.padEnd(15)} - ${info.count} records (last sync: ${info.lastSync || 'never'})`);
      }
    }

    console.log('\n🚀 Starting full PracticePanther sync...\n');

    // Run full sync
    const result = await syncService.syncAll();

    if (result.success) {
      console.log('\n🎉 SUCCESS! All PracticePanther data synced to ppData schema');
      console.log('\n📋 Summary:');
      console.log(`   • Operations: ${result.summary.operations}`);
      console.log(`   • Successful: ${result.summary.successful}`);
      console.log(`   • Total records: ${result.summary.totalRecords}`);
      console.log(`   • Duration: ${result.summary.duration}s`);
      
      // Show final status
      console.log('\n📊 Final Status:');
      const finalStatus = await syncService.getSyncStatus();
      for (const [table, info] of Object.entries(finalStatus)) {
        if (!info.error) {
          console.log(`   ✅ ${table.padEnd(15)} - ${info.count} records`);
        } else {
          console.log(`   ❌ ${table.padEnd(15)} - ${info.error}`);
        }
      }

    } else {
      console.error('\n❌ Sync failed:', result.error);
      if (result.results) {
        console.log('\nPartial results:');
        for (const [operation, operationResult] of Object.entries(result.results)) {
          const status = operationResult.success ? '✅' : '❌';
          const count = operationResult.stored || 0;
          console.log(`   ${status} ${operation.padEnd(15)} - ${count} records`);
          if (operationResult.error) {
            console.log(`      Error: ${operationResult.error}`);
          }
        }
      }
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

module.exports = { main };