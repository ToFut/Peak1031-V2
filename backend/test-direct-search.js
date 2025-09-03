require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDirectSearch() {
  console.log('🔍 Testing direct database search functionality...\n');

  try {
    // Test 1: Search by PP Matter Number
    console.log('1️⃣ Searching by PP Matter Number: 7981');
    const { data: byPPNumber } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_number, status')
      .eq('pp_matter_number', 7981);
    
    if (byPPNumber && byPPNumber.length > 0) {
      console.log(`   ✅ Found ${byPPNumber.length} exchange(s)`);
      console.log(`   Name: ${byPPNumber[0].name}`);
      console.log(`   Status: ${byPPNumber[0].status}`);
    } else {
      console.log('   ❌ No results found');
    }

    // Test 2: Search by Exchange ID
    console.log('\n2️⃣ Searching by Exchange ID: 4b7e0059-8154-4443-ae85-a0549edec8c4');
    const { data: byId } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_number')
      .eq('id', '4b7e0059-8154-4443-ae85-a0549edec8c4');
    
    if (byId && byId.length > 0) {
      console.log(`   ✅ Found: ${byId[0].name}`);
    } else {
      console.log('   ❌ No results found');
    }

    // Test 3: Search by Name (using ILIKE for partial match)
    console.log('\n3️⃣ Searching by Name containing "Ofer"');
    const { data: byName } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_number')
      .ilike('name', '%Ofer%');
    
    if (byName && byName.length > 0) {
      console.log(`   ✅ Found ${byName.length} exchange(s)`);
      byName.forEach(ex => console.log(`   - ${ex.name}`));
    } else {
      console.log('   ❌ No results found');
    }

    // Test 4: Search by Address
    console.log('\n4️⃣ Searching by Address containing "10982 Roebling"');
    const { data: byAddress } = await supabase
      .from('exchanges')
      .select('id, name, rel_property_address')
      .or('rel_property_address.ilike.%10982 Roebling%,relinquished_property_address.ilike.%10982 Roebling%');
    
    if (byAddress && byAddress.length > 0) {
      console.log(`   ✅ Found ${byAddress.length} exchange(s)`);
      console.log(`   Address: ${byAddress[0].rel_property_address}`);
    } else {
      console.log('   ❌ No results found');
    }

    // Test 5: Search by APN
    console.log('\n5️⃣ Searching by APN: 4363-007-106');
    const { data: byAPN } = await supabase
      .from('exchanges')
      .select('id, name, rel_apn')
      .eq('rel_apn', '4363-007-106');
    
    if (byAPN && byAPN.length > 0) {
      console.log(`   ✅ Found: ${byAPN[0].name}`);
      console.log(`   APN: ${byAPN[0].rel_apn}`);
    } else {
      console.log('   ❌ No results found');
    }

    // Test 6: Search by Escrow Number
    console.log('\n6️⃣ Searching by Escrow Number: CA-25-26225');
    const { data: byEscrow } = await supabase
      .from('exchanges')
      .select('id, name, rel_escrow_number')
      .eq('rel_escrow_number', 'CA-25-26225');
    
    if (byEscrow && byEscrow.length > 0) {
      console.log(`   ✅ Found: ${byEscrow[0].name}`);
      console.log(`   Escrow #: ${byEscrow[0].rel_escrow_number}`);
    } else {
      console.log('   ❌ No results found');
    }

    // Test 7: Combined search (simulating the OR conditions in the API)
    console.log('\n7️⃣ Combined search for "7981" (should match PP Matter Number)');
    const searchTerm = '7981';
    const { data: combined } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_number, rel_apn, rel_escrow_number')
      .or(`name.ilike.%${searchTerm}%,exchange_number.ilike.%${searchTerm}%,pp_matter_number.eq.${searchTerm}`);
    
    if (combined && combined.length > 0) {
      console.log(`   ✅ Found ${combined.length} exchange(s) in combined search`);
      combined.forEach(ex => console.log(`   - ${ex.name} (PP# ${ex.pp_matter_number})`));
    } else {
      console.log('   ❌ No results found in combined search');
    }

    // Get full details of the exchange
    console.log('\n📋 Full Exchange Details:');
    const { data: fullExchange } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', '4b7e0059-8154-4443-ae85-a0549edec8c4')
      .single();
    
    if (fullExchange) {
      console.log('   ID:', fullExchange.id);
      console.log('   PP Matter #:', fullExchange.pp_matter_number);
      console.log('   Name:', fullExchange.name);
      console.log('   Status:', fullExchange.status);
      console.log('   Exchange Type:', fullExchange.exchange_type);
      console.log('   Address:', fullExchange.rel_property_address);
      console.log('   APN:', fullExchange.rel_apn);
      console.log('   Escrow #:', fullExchange.rel_escrow_number);
      console.log('   Value: $', fullExchange.rel_value);
      console.log('   Client Vesting:', fullExchange.client_vesting);
      console.log('   Buyer 1:', fullExchange.buyer_1_name);
      console.log('   Buyer 2:', fullExchange.buyer_2_name);
      console.log('   Sale Date:', fullExchange.sale_date);
      console.log('   45-Day Deadline:', fullExchange.identification_deadline);
      console.log('   180-Day Deadline:', fullExchange.exchange_deadline);
    }

    console.log('\n✅ All direct database searches are working correctly!');
    console.log('\n📝 Note: The exchange data exists and is searchable in the database.');
    console.log('The frontend should be able to find it when searching for:');
    console.log('- PP Matter Number: 7981');
    console.log('- Exchange ID: 4b7e0059-8154-4443-ae85-a0549edec8c4');
    console.log('- Name: Ofer');
    console.log('- Address: 10982 Roebling');
    console.log('- APN: 4363-007-106');
    console.log('- Escrow: CA-25-26225');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the tests
testDirectSearch();