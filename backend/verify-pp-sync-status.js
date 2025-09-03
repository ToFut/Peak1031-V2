#!/usr/bin/env node

/**
 * Verify PP Sync Status
 * Checks how many exchanges have complete PP data and extracted entities
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
);

async function verifyStatus() {
  console.log('=================================================');
  console.log('📊 PRACTICEPANTHER SYNC STATUS VERIFICATION');
  console.log('=================================================\n');
  
  try {
    // 1. Check total exchanges with pp_matter_id
    const { data: allExchanges, error: allError } = await supabase
      .from('exchanges')
      .select('id, pp_matter_id, pp_data, name')
      .not('pp_matter_id', 'is', null);
      
    if (allError) {
      console.error('Error fetching exchanges:', allError);
      return;
    }
    
    const totalWithPPId = allExchanges.length;
    
    // 2. Check how many have complete PP data
    const withCompleteData = allExchanges.filter(ex => 
      ex.pp_data && 
      typeof ex.pp_data === 'object' && 
      Object.keys(ex.pp_data).length > 5 &&
      ex.pp_data.custom_field_values
    );
    
    // 3. Check how many have minimal/empty PP data
    const withMinimalData = allExchanges.filter(ex => 
      !ex.pp_data || 
      typeof ex.pp_data !== 'object' || 
      Object.keys(ex.pp_data).length <= 5
    );
    
    // 4. Sample exchanges with complete data
    const sampleComplete = withCompleteData.slice(0, 3);
    
    // 5. Check target exchange 273d2441-cebd-4c6a-9eb6-676e0b256510
    const targetExchange = allExchanges.find(ex => ex.id === '273d2441-cebd-4c6a-9eb6-676e0b256510');
    
    console.log('📊 SUMMARY STATISTICS:');
    console.log('────────────────────────────────────────────');
    console.log(`Total exchanges with pp_matter_id: ${totalWithPPId}`);
    console.log(`✅ With complete PP data: ${withCompleteData.length} (${(withCompleteData.length/totalWithPPId*100).toFixed(1)}%)`);
    console.log(`❌ With minimal/empty PP data: ${withMinimalData.length} (${(withMinimalData.length/totalWithPPId*100).toFixed(1)}%)`);
    
    console.log('\n📋 SAMPLE EXCHANGES WITH COMPLETE DATA:');
    console.log('────────────────────────────────────────────');
    sampleComplete.forEach((ex, idx) => {
      const customFields = ex.pp_data.custom_field_values?.length || 0;
      const assignedUsers = ex.pp_data.assigned_to_users?.length || 0;
      console.log(`${idx + 1}. ${ex.name || ex.id}`);
      console.log(`   - PP Data Keys: ${Object.keys(ex.pp_data).length}`);
      console.log(`   - Custom Fields: ${customFields}`);
      console.log(`   - Assigned Users: ${assignedUsers}`);
    });
    
    console.log('\n🎯 TARGET EXCHANGE STATUS (273d2441-cebd-4c6a-9eb6-676e0b256510):');
    console.log('────────────────────────────────────────────');
    if (targetExchange) {
      console.log(`Name: ${targetExchange.name}`);
      console.log(`PP Matter ID: ${targetExchange.pp_matter_id}`);
      if (targetExchange.pp_data && typeof targetExchange.pp_data === 'object') {
        console.log(`PP Data Keys: ${Object.keys(targetExchange.pp_data).length}`);
        console.log(`Custom Fields: ${targetExchange.pp_data.custom_field_values?.length || 0}`);
        console.log(`Has Complete Data: ${Object.keys(targetExchange.pp_data).length > 5 ? '✅ Yes' : '❌ No'}`);
      } else {
        console.log('PP Data: ❌ Empty or invalid');
      }
    } else {
      console.log('❌ Exchange not found');
    }
    
    // 6. Check contacts/people created
    const { data: peopleCount, error: peopleError } = await supabase
      .from('people')
      .select('id', { count: 'exact', head: true });
      
    const { data: contactsCount, error: contactsError } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true });
    
    console.log('\n👥 CONTACTS/USERS STATUS:');
    console.log('────────────────────────────────────────────');
    console.log(`People table: ${peopleError ? 'Error' : peopleCount || 0} records`);
    console.log(`Contacts table: ${contactsError ? 'Error' : contactsCount || 0} records`);
    
    // 7. Sample some people with PP data
    const { data: samplePeople } = await supabase
      .from('people')
      .select('full_name, contact_type, pp_contact_id')
      .not('pp_contact_id', 'is', null)
      .limit(5);
      
    if (samplePeople && samplePeople.length > 0) {
      console.log('\n📋 Sample People with PP IDs:');
      samplePeople.forEach(person => {
        console.log(`  - ${person.full_name} (${person.contact_type}) - PP ID: ${person.pp_contact_id}`);
      });
    }
    
    // 8. Next steps recommendation
    console.log('\n📌 RECOMMENDATIONS:');
    console.log('────────────────────────────────────────────');
    
    if (withMinimalData.length > 0) {
      console.log(`⚠️ ${withMinimalData.length} exchanges still need PP data sync`);
      console.log('   Run: node comprehensive-pp-sync.js');
    }
    
    if (withCompleteData.length > 0) {
      console.log(`✅ ${withCompleteData.length} exchanges ready for entity extraction`);
      if (peopleCount < 100) {
        console.log('   Note: People table needs "assigned_exchanges UUID[]" column');
        console.log('   Add via Supabase dashboard, then run: node run-entity-extraction.js');
      }
    }
    
    console.log('\n✅ Verification complete!');
    
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

verifyStatus().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});