require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSearch() {
  console.log('🔍 Debugging search for "860 London Green Way"\n');

  try {
    // First, check if the exchange exists and what fields it has
    const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
    
    console.log('1️⃣ Checking exchange data...');
    const { data: exchange, error: fetchError } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching exchange:', fetchError);
      return;
    }

    console.log('✅ Exchange found:');
    console.log('  - ID:', exchange.id);
    console.log('  - Name:', exchange.name);
    console.log('  - rel_property_address:', exchange.rel_property_address);
    console.log('  - relinquished_property_address:', exchange.relinquished_property_address);
    console.log('  - Status:', exchange.status);
    console.log('  - is_active:', exchange.is_active);

    // Test different search approaches
    console.log('\n2️⃣ Testing search queries...\n');

    // Test 1: Search in name field
    console.log('Test 1: Searching in name field for "860 London Green"...');
    const { data: nameSearch, error: nameError } = await supabase
      .from('exchanges')
      .select('id, name')
      .ilike('name', '%860 London Green%');
    
    console.log(`Result: ${nameSearch?.length || 0} exchanges found`);
    if (nameSearch && nameSearch.length > 0) {
      nameSearch.forEach(e => console.log(`  - ${e.name}`));
    }

    // Test 2: Search in rel_property_address
    console.log('\nTest 2: Searching in rel_property_address for "860 London Green"...');
    const { data: relSearch, error: relError } = await supabase
      .from('exchanges')
      .select('id, name, rel_property_address')
      .ilike('rel_property_address', '%860 London Green%');
    
    console.log(`Result: ${relSearch?.length || 0} exchanges found`);
    if (relSearch && relSearch.length > 0) {
      relSearch.forEach(e => console.log(`  - ${e.name} | Address: ${e.rel_property_address}`));
    }

    // Test 3: Combined OR search (like the API should do)
    console.log('\nTest 3: Combined OR search across multiple fields...');
    const { data: orSearch, error: orError } = await supabase
      .from('exchanges')
      .select('id, name, rel_property_address')
      .or('name.ilike.%860 London Green%,rel_property_address.ilike.%860 London Green%');
    
    console.log(`Result: ${orSearch?.length || 0} exchanges found`);
    if (orSearch && orSearch.length > 0) {
      orSearch.forEach(e => console.log(`  - ${e.name} | Address: ${e.rel_property_address}`));
    }

    // Test 4: Check if active filter affects results
    console.log('\nTest 4: Searching with is_active=true filter...');
    const { data: activeSearch, error: activeError } = await supabase
      .from('exchanges')
      .select('id, name, rel_property_address, is_active')
      .eq('is_active', true)
      .or('name.ilike.%860 London Green%,rel_property_address.ilike.%860 London Green%');
    
    console.log(`Result: ${activeSearch?.length || 0} exchanges found`);
    if (activeSearch && activeSearch.length > 0) {
      activeSearch.forEach(e => console.log(`  - ${e.name} | Active: ${e.is_active}`));
    }

    // Test 5: Check all exchanges with "London" in any field
    console.log('\nTest 5: Broader search for just "London"...');
    const { data: broadSearch, error: broadError } = await supabase
      .from('exchanges')
      .select('id, name, rel_property_address')
      .or('name.ilike.%London%,rel_property_address.ilike.%London%,relinquished_property_address.ilike.%London%')
      .limit(5);
    
    console.log(`Result: ${broadSearch?.length || 0} exchanges found (limited to 5)`);
    if (broadSearch && broadSearch.length > 0) {
      broadSearch.forEach(e => console.log(`  - ${e.name} | Address: ${e.rel_property_address}`));
    }

    // Check if issue is with the API or database
    console.log('\n📊 Summary:');
    if ((nameSearch && nameSearch.length > 0) || (relSearch && relSearch.length > 0) || (orSearch && orSearch.length > 0)) {
      console.log('✅ Exchange is searchable in database');
      console.log('❌ API search might have issues - check backend route implementation');
    } else {
      console.log('⚠️ Exchange might not be searchable - check data fields');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the debug
debugSearch();