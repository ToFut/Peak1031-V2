require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExchangeData() {
  console.log('🔍 Checking full exchange data for e00bfb0f-df96-438e-98f0-87ef91b708a7...\n');

  try {
    const { data: exchange, error } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7')
      .single();
    
    if (exchange) {
      console.log('✅ Found exchange');
      console.log('\n📊 Full Data Analysis:');
      console.log('================================');
      
      // Show all non-null fields
      Object.keys(exchange).forEach(key => {
        const value = exchange[key];
        if (value !== null && value !== undefined) {
          if (key === 'pp_data' && typeof value === 'object') {
            console.log(`\n${key}: [Object with ${Object.keys(value).length} keys]`);
            // Show pp_data contents
            if (Object.keys(value).length > 0) {
              console.log('  PP Data Contents:');
              Object.keys(value).forEach(ppKey => {
                const ppValue = value[ppKey];
                if (ppValue !== null && ppValue !== undefined && ppValue !== '') {
                  console.log(`    ${ppKey}:`, typeof ppValue === 'object' ? JSON.stringify(ppValue).substring(0, 100) : ppValue);
                }
              });
            }
          } else if (typeof value === 'object') {
            console.log(`${key}:`, JSON.stringify(value));
          } else {
            console.log(`${key}:`, value);
          }
        }
      });
      
      // Check if this looks like manually created data
      console.log('\n🔍 Data Source Analysis:');
      console.log('pp_matter_id format:', exchange.pp_matter_id ? 'UUID (manually created?)' : 'Not set');
      console.log('Has pp_data:', exchange.pp_data ? 'Yes' : 'No');
      console.log('Created at:', exchange.created_at);
      console.log('Last sync at:', exchange.last_sync_at);
      
      // Check replacement properties
      console.log('\n🏘️ Replacement Properties:');
      const { data: repProps } = await supabase
        .from('replacement_properties')
        .select('*')
        .eq('exchange_id', exchange.id);
      
      if (repProps && repProps.length > 0) {
        repProps.forEach((prop, idx) => {
          console.log(`  Property ${idx + 1}:`, prop.address || 'No address');
        });
      } else {
        console.log('  No replacement properties');
      }
      
      // Check participants
      console.log('\n👥 Participants:');
      const { data: participants } = await supabase
        .from('exchange_participants')
        .select('*, people(*)')
        .eq('exchange_id', exchange.id);
      
      if (participants && participants.length > 0) {
        participants.forEach(p => {
          if (p.people) {
            console.log(`  ${p.people.first_name} ${p.people.last_name} (${p.role})`);
          }
        });
      } else {
        console.log('  No participants');
      }
      
      console.log('\n⚠️ KEY ISSUES IDENTIFIED:');
      console.log('1. pp_matter_id is UUID instead of "7869"');
      console.log('2. No pp_data field populated with PracticePanther data');
      console.log('3. Missing key fields like:');
      console.log('   - Client vesting information');
      console.log('   - Buyer information');
      console.log('   - Settlement agents');
      console.log('   - Referral information');
      console.log('   - Bank and proceeds details');
      console.log('   - Day 45 and Day 180 deadlines');
      console.log('   - Replacement property details');
      console.log('   - APN numbers');
      console.log('   - Property type');
      console.log('   - Contract dates');
      
      console.log('\n💡 SOLUTION:');
      console.log('This exchange needs to be properly synced from PracticePanther:');
      console.log('1. Update pp_matter_id to "7869"');
      console.log('2. Fetch full data from PP API');
      console.log('3. Store all PP fields in pp_data');
      console.log('4. Map key fields to our schema');
      console.log('5. Update the exchange detail page to display pp_data fields');
      
    } else {
      console.log('❌ Exchange not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkExchangeData();