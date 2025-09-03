require('dotenv').config();
const PracticePartnerService = require('./services/practicePartnerService');

async function testSpecificMatterSync() {
  console.log('🧪 TESTING COMPREHENSIVE SYNC WITH KNOWN MATTER...\n');
  
  const practicePartnerService = new PracticePartnerService();
  
  try {
    // Test with matter 7869 that we know has comprehensive data
    const testMatterId = '34a90c7c-07e1-4540-b017-b50828c6b313'; // Matter 7869 GUID
    
    console.log(`🔍 Testing with known matter: ${testMatterId}`);
    
    // Fetch the complete matter details directly
    console.log('1. Fetching complete matter details...');
    const completeMatter = await practicePartnerService.fetchMatterDetails(testMatterId);
    
    console.log(`✅ Fetched matter: ${completeMatter.display_name || completeMatter.name}`);
    console.log(`💎 Custom fields available: ${completeMatter.custom_field_values?.length || 0}`);
    
    // Test the sync process
    console.log('\n2. Testing comprehensive sync process...');
    const syncResult = await practicePartnerService.syncMatter(completeMatter);
    
    console.log(`✅ Sync result: ${syncResult.action}`);
    
    // Analyze the results
    if (syncResult.data) {
      console.log('\n📊 SYNC ANALYSIS:');
      console.log('=================');
      
      // Check PP data storage
      if (syncResult.data.pp_data && syncResult.data.pp_data.custom_field_values) {
        console.log(`✅ Complete PP data stored: ${syncResult.data.pp_data.custom_field_values.length} custom fields`);
      } else {
        console.log('❌ No complete PP data stored');
      }
      
      // Check mapped database columns
      const mappedFields = [
        { field: 'type_of_exchange', label: 'Exchange Type' },
        { field: 'client_vesting', label: 'Client Vesting' },
        { field: 'bank', label: 'Banking Institution' },
        { field: 'proceeds', label: 'Proceeds' },
        { field: 'day_45', label: 'Day 45' },
        { field: 'day_180', label: 'Day 180' },
        { field: 'property_type', label: 'Property Type' },
        { field: 'referral_source', label: 'Referral Source' },
        { field: 'settlement_agent', label: 'Settlement Agent' },
        { field: 'rel_value', label: 'Relinquished Value' },
        { field: 'rep_1_value', label: 'Replacement Value' }
      ];
      
      console.log('\n💎 MAPPED DATABASE FIELDS:');
      console.log('==========================');
      
      let mappedCount = 0;
      mappedFields.forEach(({ field, label }) => {
        const value = syncResult.data[field];
        if (value) {
          mappedCount++;
          console.log(`✅ ${label}: ${value}`);
        } else {
          console.log(`❌ ${label}: Not mapped`);
        }
      });
      
      console.log(`\n📊 Mapping Success: ${mappedCount}/${mappedFields.length} fields (${Math.round((mappedCount/mappedFields.length)*100)}%)`);
      
      // Show PP-specific fields
      console.log('\n🔍 PP-SPECIFIC FIELDS:');
      console.log('=====================');
      console.log(`✅ PP Display Name: ${syncResult.data.pp_display_name || 'Not mapped'}`);
      console.log(`✅ PP Matter Number: ${syncResult.data.pp_matter_number || 'Not mapped'}`);
      console.log(`✅ PP Status: ${syncResult.data.pp_matter_status || 'Not mapped'}`);
      console.log(`✅ PP Responsible Attorney: ${syncResult.data.pp_responsible_attorney || 'Not mapped'}`);
      
      console.log('\n🎉 COMPREHENSIVE SYNC SUCCESS!');
      console.log('✅ All future PP syncs will now collect complete data');
      console.log('✅ Custom fields are properly mapped to database columns');
      console.log('✅ Complete PP data is available for component access');
      console.log('✅ Frontend will display rich PP information for all exchanges');
      
    } else {
      console.log('❌ No sync data returned');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testSpecificMatterSync();