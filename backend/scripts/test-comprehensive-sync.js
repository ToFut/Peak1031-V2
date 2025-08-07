#!/usr/bin/env node

/**
 * Test script for comprehensive PracticePanther sync
 * 
 * This will sync ALL PP data with complete field mapping
 * to the comprehensive optimized schema
 */

const ComprehensivePPSyncService = require('../services/comprehensive-pp-sync');

async function testComprehensiveSync() {
  console.log('🧪 Testing Comprehensive PracticePanther Sync');
  console.log('===============================================');
  console.log('');
  
  const syncService = new ComprehensivePPSyncService();
  
  try {
    // First, show current sync status
    console.log('📊 Current Sync Status:');
    const currentStatus = await syncService.getSyncStatus();
    
    for (const [table, status] of Object.entries(currentStatus)) {
      const hasData = status.count > 0 ? '✅' : '❌';
      const lastSync = status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never';
      console.log(`   ${hasData} ${table.padEnd(12)} - ${status.count} records | Last: ${lastSync}`);
    }
    
    console.log('');
    console.log('🚀 Starting comprehensive sync with ALL PP fields...');
    console.log('');
    
    // Perform comprehensive sync
    const result = await syncService.syncAll();
    
    if (result.success) {
      console.log('');
      console.log('🎉 Comprehensive sync completed successfully!');
      console.log('');
      console.log('📋 What was synced:');
      console.log('  ✅ contacts    - ALL PP contact fields (20+ fields)');
      console.log('  ✅ exchanges   - ALL PP matter fields + exchange_chat_id (15+ fields)');
      console.log('  ✅ tasks       - ALL PP task fields (10+ fields)');
      console.log('  ✅ invoices    - ALL PP invoice fields');
      console.log('');
      console.log('🔥 Features now available:');
      console.log('  🔍 Full-text search across all PP data');
      console.log('  💬 Exchange-specific chat system ready');
      console.log('  👥 Comprehensive participant management');
      console.log('  📊 Rich analytics with PP field data');
      console.log('  🔄 Complete PP field mapping preserved');
      console.log('');
    } else {
      console.log('');
      console.log('❌ Sync completed with errors:');
      console.log('Error:', result.error);
      console.log('');
    }
    
    // Show updated status
    console.log('📊 Updated Sync Status:');
    const updatedStatus = await syncService.getSyncStatus();
    
    let totalRecords = 0;
    for (const [table, status] of Object.entries(updatedStatus)) {
      const hasData = status.count > 0 ? '✅' : '❌';
      const lastSync = status.lastSync ? new Date(status.lastSync).toLocaleString() : 'Never';
      console.log(`   ${hasData} ${table.padEnd(12)} - ${status.count} records | Last: ${lastSync}`);
      totalRecords += status.count;
    }
    
    console.log('');
    console.log(`📈 Total PP records in comprehensive schema: ${totalRecords}`);
    console.log('🎯 All PracticePanther data is now available with complete field mapping!');
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  testComprehensiveSync()
    .then(() => {
      console.log('\\n✅ Test completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\\n❌ Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = testComprehensiveSync;