require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkFinalStatus() {
  console.log('🎯 FINAL STATUS OF ALL PP FIELDS:');
  console.log('===============================\\n');
  
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  const { data, error } = await supabase
    .from('exchanges')
    .select('rel_apn, rel_contract_date, buyer_1_name, buyer_2_name, client_vesting, bank, day_45, day_180, proceeds, rel_property_address, rep_1_property_address, rel_value, rep_1_value, type_of_exchange')
    .eq('id', exchangeId)
    .single();
    
  if (error) {
    console.log('❌ Error:', error.message);
    return;
  }
  
  const fields = [
    ['Client Vesting', data.client_vesting],
    ['Bank', data.bank], 
    ['Day 45', data.day_45],
    ['Day 180', data.day_180],
    ['Proceeds', data.proceeds],
    ['Relinquished Address', data.rel_property_address],
    ['Relinquished Value', data.rel_value],
    ['Relinquished APN', data.rel_apn],
    ['Contract Date', data.rel_contract_date],
    ['Replacement Address', data.rep_1_property_address],
    ['Replacement Value', data.rep_1_value],
    ['Buyer 1 Name', data.buyer_1_name],
    ['Buyer 2 Name', data.buyer_2_name],
    ['Exchange Type', data.type_of_exchange]
  ];
  
  fields.forEach(([label, value]) => {
    const status = value ? '✅' : '❌';
    console.log(`${status} ${label}: ${value || 'NULL'}`);
  });
  
  console.log('\\n📊 SUMMARY:');
  const filled = fields.filter(([label, value]) => value).length;
  const total = fields.length;
  console.log(`✅ Filled: ${filled}/${total} fields (${Math.round(filled/total*100)}%)`);
  
  console.log('\\n🎯 WHAT SHOULD NOW DISPLAY ON FRONTEND:');
  console.log('• APN field should show: 65061-09-175 (if rel_apn was updated)');
  console.log('• Contract Date should show the date');  
  console.log('• Buyer 1 should show: Louise Claire Pallan');
  console.log('• All other existing PP data should continue showing correctly');
}

checkFinalStatus();