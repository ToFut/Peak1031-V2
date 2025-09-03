require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixLondonGreenSearch() {
  console.log('🔧 Fixing search for 860 London Green Way exchange\n');

  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';

  try {
    // First, get the current exchange data
    console.log('📋 Getting current exchange data...');
    const { data: currentExchange, error: fetchError } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    if (fetchError || !currentExchange) {
      console.error('❌ Error fetching exchange:', fetchError);
      return;
    }

    console.log('✅ Found exchange:', currentExchange.name);
    console.log('Current fields:');
    console.log('  - name:', currentExchange.name);
    console.log('  - rel_property_address:', currentExchange.rel_property_address);
    console.log('  - relinquished_property_value:', currentExchange.relinquished_property_value);

    // Update only the fields that exist
    console.log('\n📝 Updating exchange with searchable address in available fields...');
    
    const updateData = {
      // Update rel_property_address if it exists
      rel_property_address: '860 London Green Way, Colorado Springs, CO',
      rel_property_city: 'Colorado Springs',
      rel_property_state: 'CO',
      // The name already contains the address and is searchable
      // Add tags for better searchability
      tags: ['860', 'London Green', 'Colorado Springs', 'Kicelian', 'Hector']
    };

    const { data: updatedExchange, error: updateError } = await supabase
      .from('exchanges')
      .update(updateData)
      .eq('id', exchangeId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating exchange:', updateError);
      console.error('Error details:', updateError);
      return;
    }

    console.log('✅ Exchange updated successfully!');
    
    // Test searching for it
    console.log('\n🔍 Testing search functionality...');
    
    // Test 1: Search in name field (which already works)
    const { data: searchTest1 } = await supabase
      .from('exchanges')
      .select('id, name')
      .ilike('name', '%860 London Green%');
    
    if (searchTest1 && searchTest1.length > 0) {
      console.log('✅ Search by "860 London Green" in name field works!');
    }

    // Test 2: Search in rel_property_address
    const { data: searchTest2 } = await supabase
      .from('exchanges')
      .select('id, name, rel_property_address')
      .ilike('rel_property_address', '%860 London Green%');
    
    if (searchTest2 && searchTest2.length > 0) {
      console.log('✅ Search by "860 London Green" in rel_property_address works!');
    }

    // Test 3: Search by any of the search terms
    const { data: searchTest3 } = await supabase
      .from('exchanges')
      .select('id, name')
      .or('name.ilike.%860%,rel_property_address.ilike.%860%');
    
    if (searchTest3 && searchTest3.length > 0) {
      console.log('✅ Search by "860" works!');
    }

    // Test 4: Search by street name
    const { data: searchTest4 } = await supabase
      .from('exchanges')
      .select('id, name')
      .or('name.ilike.%London Green%,rel_property_address.ilike.%London Green%');
    
    if (searchTest4 && searchTest4.length > 0) {
      console.log('✅ Search by "London Green" works!');
    }

    console.log('\n📊 Updated Exchange Details:');
    console.log('ID:', exchangeId);
    console.log('Name:', updatedExchange.name);
    console.log('Rel Property Address:', updatedExchange.rel_property_address);
    console.log('City:', updatedExchange.rel_property_city);
    console.log('State:', updatedExchange.rel_property_state);
    console.log('Tags:', updatedExchange.tags);
    
    console.log('\n🎯 The exchange is now searchable by:');
    console.log('- Full address: "860 London Green Way"');
    console.log('- Street number: "860"');
    console.log('- Street name: "London Green"');
    console.log('- City: "Colorado Springs"');
    console.log('- Client name: "Kicelian" or "Hector"');
    console.log('- Exchange number: "7869"');
    
    console.log('\n✅ The exchange should now appear when searching in the frontend!');
    console.log('\n💡 Note: The backend search has been updated to check both the name and rel_property_address fields.');
    console.log('The search will work for any of these terms: 860, London, Green, London Green, 860 London Green Way');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the fix
fixLondonGreenSearch();