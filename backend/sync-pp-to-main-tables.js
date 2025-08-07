const PPTokenManager = require('./services/ppTokenManager');
const UnifiedPPSyncService = require('./services/unified-pp-sync');

async function syncPPToMainTables() {
  console.log('🚀 Starting PracticePanther sync to MAIN tables...');
  console.log('This will populate your main database tables with PP data\n');
  
  try {
    // Initialize token manager
    const tokenManager = new PPTokenManager();
    
    // Check if we have a valid token
    const tokenStatus = await tokenManager.getTokenStatus();
    
    if (tokenStatus.status === 'no_token') {
      console.log('❌ No PracticePanther token found');
      console.log('Please complete OAuth setup first in the Admin Dashboard');
      return;
    }
    
    console.log(`✅ PP Token Status: ${tokenStatus.status}`);
    
    if (tokenStatus.status === 'expired' || tokenStatus.status === 'expiring_soon') {
      console.log('🔄 Refreshing token...');
      const refreshed = await tokenManager.refreshToken();
      if (!refreshed) {
        console.log('❌ Failed to refresh token');
        return;
      }
      console.log('✅ Token refreshed successfully');
    }
    
    // Initialize unified sync service
    const syncService = new UnifiedPPSyncService(tokenManager);
    
    // Run full sync
    console.log('\n📊 Starting data sync...\n');
    const results = await syncService.runFullSync();
    
    // Display results
    console.log('\n📊 Sync Results:');
    console.log('================');
    
    Object.entries(results).forEach(([table, result]) => {
      const icon = result.errors === 0 ? '✅' : '⚠️';
      console.log(`${icon} ${table}: ${result.synced} synced, ${result.errors} errors`);
    });
    
    const totalSynced = Object.values(results).reduce((sum, r) => sum + r.synced, 0);
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0);
    
    console.log('\n📊 Total Summary:');
    console.log(`  • Records synced: ${totalSynced}`);
    console.log(`  • Errors: ${totalErrors}`);
    
    if (totalSynced > 0) {
      console.log('\n✅ Success! Your main database tables now contain PP data');
      console.log('\n📌 Data is now available in:');
      console.log('  • contacts table (with all phone numbers)');
      console.log('  • tasks table (with PP assignments)');
      console.log('  • invoices table (financial data)');
      console.log('  • expenses table (expense tracking)');
      console.log('  • exchanges table (linked to PP matters)');
      console.log('  • users table (linked to PP users)');
    } else {
      console.log('\n⚠️ No data was synced. This could mean:');
      console.log('  • No data in PracticePanther yet');
      console.log('  • API access issues');
      console.log('  • Check the token and try again');
    }
    
  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the sync
syncPPToMainTables();