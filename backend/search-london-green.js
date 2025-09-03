require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchLondonGreen() {
  console.log('🔍 Searching for exchanges with address: 860 London Green Way\n');

  try {
    // Search in multiple address fields
    console.log('1️⃣ Searching in relinquished_property_address...');
    const { data: relPropertySearch } = await supabase
      .from('exchanges')
      .select('id, name, relinquished_property_address, status')
      .ilike('relinquished_property_address', '%860 London Green%');
    
    if (relPropertySearch && relPropertySearch.length > 0) {
      console.log(`   ✅ Found ${relPropertySearch.length} exchange(s) in relinquished_property_address`);
      relPropertySearch.forEach(ex => {
        console.log(`   - ${ex.name}`);
        console.log(`     Address: ${ex.relinquished_property_address}`);
        console.log(`     ID: ${ex.id}`);
      });
    } else {
      console.log('   ❌ No results in relinquished_property_address');
    }

    // Search in rel_property_address
    console.log('\n2️⃣ Searching in rel_property_address...');
    const { data: relAddressSearch } = await supabase
      .from('exchanges')
      .select('id, name, rel_property_address, status')
      .ilike('rel_property_address', '%860 London Green%');
    
    if (relAddressSearch && relAddressSearch.length > 0) {
      console.log(`   ✅ Found ${relAddressSearch.length} exchange(s) in rel_property_address`);
      relAddressSearch.forEach(ex => {
        console.log(`   - ${ex.name}`);
        console.log(`     Address: ${ex.rel_property_address}`);
        console.log(`     ID: ${ex.id}`);
      });
    } else {
      console.log('   ❌ No results in rel_property_address');
    }

    // Search in name field
    console.log('\n3️⃣ Searching in exchange name...');
    const { data: nameSearch } = await supabase
      .from('exchanges')
      .select('id, name, status')
      .ilike('name', '%860 London Green%');
    
    if (nameSearch && nameSearch.length > 0) {
      console.log(`   ✅ Found ${nameSearch.length} exchange(s) in name field`);
      nameSearch.forEach(ex => {
        console.log(`   - ${ex.name}`);
        console.log(`     ID: ${ex.id}`);
      });
    } else {
      console.log('   ❌ No results in name field');
    }

    // Search for partial matches - just "London Green"
    console.log('\n4️⃣ Searching for partial match "London Green"...');
    const { data: partialSearch } = await supabase
      .from('exchanges')
      .select('id, name, relinquished_property_address, rel_property_address')
      .or('name.ilike.%London Green%,relinquished_property_address.ilike.%London Green%,rel_property_address.ilike.%London Green%');
    
    if (partialSearch && partialSearch.length > 0) {
      console.log(`   ✅ Found ${partialSearch.length} exchange(s) with "London Green"`);
      partialSearch.forEach(ex => {
        console.log(`   - ${ex.name}`);
        if (ex.relinquished_property_address) {
          console.log(`     Relinquished: ${ex.relinquished_property_address}`);
        }
        if (ex.rel_property_address) {
          console.log(`     Rel Address: ${ex.rel_property_address}`);
        }
        console.log(`     ID: ${ex.id}`);
      });
    } else {
      console.log('   ❌ No results for "London Green"');
    }

    // Search with just the number "860"
    console.log('\n5️⃣ Searching for exchanges with "860" in address...');
    const { data: numberSearch } = await supabase
      .from('exchanges')
      .select('id, name, relinquished_property_address, rel_property_address')
      .or('relinquished_property_address.ilike.%860%,rel_property_address.ilike.%860%,name.ilike.%860%')
      .limit(10);
    
    if (numberSearch && numberSearch.length > 0) {
      console.log(`   ✅ Found ${numberSearch.length} exchange(s) with "860"`);
      numberSearch.forEach(ex => {
        console.log(`   - ${ex.name}`);
        if (ex.relinquished_property_address) {
          console.log(`     Relinquished: ${ex.relinquished_property_address}`);
        }
        if (ex.rel_property_address) {
          console.log(`     Rel Address: ${ex.rel_property_address}`);
        }
      });
    } else {
      console.log('   ❌ No results for "860"');
    }

    // Get a sample of exchanges to see what addresses look like
    console.log('\n6️⃣ Sample of existing exchanges with addresses:');
    const { data: sampleExchanges } = await supabase
      .from('exchanges')
      .select('id, name, relinquished_property_address, rel_property_address')
      .or('relinquished_property_address.not.is.null,rel_property_address.not.is.null')
      .limit(5);
    
    if (sampleExchanges && sampleExchanges.length > 0) {
      console.log(`   Sample exchanges with addresses:`);
      sampleExchanges.forEach(ex => {
        console.log(`   - ${ex.name}`);
        if (ex.relinquished_property_address) {
          console.log(`     Relinquished: ${ex.relinquished_property_address}`);
        }
        if (ex.rel_property_address) {
          console.log(`     Rel Address: ${ex.rel_property_address}`);
        }
      });
    }

    console.log('\n📝 Summary:');
    console.log('If "860 London Green Way" is not found, it might be because:');
    console.log('1. The exchange doesn\'t exist yet in the database');
    console.log('2. The address is stored in a different format');
    console.log('3. The address might be in replacement property fields instead');
    console.log('\nWould you like me to create this exchange or update an existing one?');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the search
searchLondonGreen();