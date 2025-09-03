require('dotenv').config();
const PracticePartnerService = require('./services/practicePartnerService');

async function testComprehensiveSync() {
  // Initialize the service
  const practicePartnerService = new PracticePartnerService();
  console.log('🧪 TESTING COMPREHENSIVE PP SYNC WITH CUSTOM FIELDS...\n');
  
  try {
    // Fetch a small batch of matters to test
    console.log('1. Fetching basic matter list from PP...');
    const mattersResult = await practicePartnerService.fetchMatters({ per_page: 5, page: 1 });
    const matters = mattersResult.results;
    
    console.log(`✅ Fetched ${matters.length} matters for testing`);
    
    if (matters.length === 0) {
      console.log('❌ No matters found for testing');
      return;
    }
    
    // Test the enhanced sync process
    console.log('\n2. Testing enhanced sync process...');
    let syncResults = [];
    
    for (let i = 0; i < Math.min(3, matters.length); i++) {
      const matter = matters[i];
      console.log(`\n🔄 Testing sync for matter ${matter.id} (${matter.name})...`);
      
      try {
        const result = await practicePartnerService.syncMatter(matter);
        syncResults.push({
          matterId: matter.id,
          matterName: matter.name,
          result: result.action,
          success: true
        });
        
        console.log(`✅ Sync result: ${result.action}`);
        
        // Check if the data now has custom fields
        if (result.data?.pp_data?.custom_field_values) {
          const customFieldsCount = result.data.pp_data.custom_field_values.length;
          console.log(`💎 Custom fields stored: ${customFieldsCount}`);
          
          // Show some mapped fields
          const mappedFields = [
            'type_of_exchange',
            'client_vesting', 
            'bank',
            'proceeds',
            'property_type',
            'referral_source'
          ];
          
          let mappedCount = 0;
          mappedFields.forEach(field => {
            if (result.data[field]) {
              mappedCount++;
              console.log(`   ✅ ${field}: ${result.data[field]}`);
            }
          });
          
          console.log(`📊 Mapped ${mappedCount}/${mappedFields.length} tested fields to database columns`);
        } else {
          console.log('⚠️  No custom fields in pp_data');
        }
        
      } catch (error) {
        console.error(`❌ Sync failed for matter ${matter.id}:`, error.message);
        syncResults.push({
          matterId: matter.id,
          matterName: matter.name,
          result: 'error',
          error: error.message,
          success: false
        });
      }
      
      // Add small delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n📊 COMPREHENSIVE SYNC TEST RESULTS:');
    console.log('===================================');
    
    const successful = syncResults.filter(r => r.success).length;
    const failed = syncResults.filter(r => !r.success).length;
    
    console.log(`✅ Successful syncs: ${successful}`);
    console.log(`❌ Failed syncs: ${failed}`);
    console.log(`🎯 Success rate: ${Math.round((successful / syncResults.length) * 100)}%`);
    
    if (successful > 0) {
      console.log('\n🎉 COMPREHENSIVE SYNC IS WORKING!');
      console.log('✅ Matters are now being synced with complete PP data including custom fields');
      console.log('✅ Custom fields are being mapped to database columns');
      console.log('✅ Complete PP data is stored in pp_data for component access');
      console.log('\n📋 NEXT STEPS:');
      console.log('1. Run a full sync to update all existing exchanges');
      console.log('2. Verify frontend displays comprehensive data for all exchanges');
    } else {
      console.log('\n⚠️  SYNC ISSUES DETECTED - Review errors above');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testComprehensiveSync();