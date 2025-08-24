/**
 * Test script to run comprehensive PP sync and get ALL 11,000+ exchanges
 */

const ComprehensivePPSyncService = require('./services/comprehensive-pp-sync');

async function runFullSync() {
  console.log('🚀 Starting comprehensive sync to fetch ALL 11,000+ exchanges...\n');
  
  try {
    const syncService = new ComprehensivePPSyncService();
    const result = await syncService.syncAll();
    
    console.log('\n📊 FINAL RESULTS:');
    console.log('=================');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.results && result.results.exchanges) {
      console.log(`\n🎯 EXCHANGES SYNCED: ${result.results.exchanges.stored || 0}`);
      console.log('This should be close to 11,000+ if successful!');
    }
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
  }
}

// Run the sync
runFullSync().then(() => {
  console.log('\n✅ Sync test completed');
  process.exit(0);
}).catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});