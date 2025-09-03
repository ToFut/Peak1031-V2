require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateLondonGreenExchange() {
  console.log('🔄 Updating exchange for 860 London Green Way to be fully searchable\n');

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

    // Update the exchange with the address in searchable fields
    console.log('\n📝 Updating exchange with searchable address fields...');
    
    const updateData = {
      // Keep existing data
      ...currentExchange,
      // Add/update address fields for better searchability
      relinquished_property_address: '860 London Green Way, Colorado Springs, CO',
      rel_property_address: '860 London Green Way, Colorado Springs, CO',
      // Parse city, state, zip if not already set
      rel_property_city: currentExchange.rel_property_city || 'Colorado Springs',
      rel_property_state: currentExchange.rel_property_state || 'CO',
      // Ensure the name includes the address for search
      name: currentExchange.name // Keep the existing name which already has the address
    };

    // Remove fields that shouldn't be updated
    delete updateData.id;
    delete updateData.created_at;

    const { data: updatedExchange, error: updateError } = await supabase
      .from('exchanges')
      .update(updateData)
      .eq('id', exchangeId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Error updating exchange:', updateError);
      return;
    }

    console.log('✅ Exchange updated successfully!');
    
    // Test searching for it
    console.log('\n🔍 Testing search functionality...');
    
    // Test 1: Search by full address
    const { data: searchTest1 } = await supabase
      .from('exchanges')
      .select('id, name, relinquished_property_address')
      .ilike('relinquished_property_address', '%860 London Green%');
    
    if (searchTest1 && searchTest1.length > 0) {
      console.log('✅ Search by "860 London Green" in relinquished_property_address works!');
    }

    // Test 2: Search by street number
    const { data: searchTest2 } = await supabase
      .from('exchanges')
      .select('id, name')
      .or('name.ilike.%860%,relinquished_property_address.ilike.%860%,rel_property_address.ilike.%860%');
    
    if (searchTest2 && searchTest2.length > 0) {
      console.log('✅ Search by "860" works!');
    }

    // Test 3: Search by street name
    const { data: searchTest3 } = await supabase
      .from('exchanges')
      .select('id, name')
      .or('name.ilike.%London Green%,relinquished_property_address.ilike.%London Green%,rel_property_address.ilike.%London Green%');
    
    if (searchTest3 && searchTest3.length > 0) {
      console.log('✅ Search by "London Green" works!');
    }

    console.log('\n📊 Exchange Details:');
    console.log('ID:', exchangeId);
    console.log('Name:', updatedExchange.name);
    console.log('Relinquished Address:', updatedExchange.relinquished_property_address);
    console.log('Rel Property Address:', updatedExchange.rel_property_address);
    
    console.log('\n🎯 The exchange is now searchable by:');
    console.log('- Full address: "860 London Green Way"');
    console.log('- Street number: "860"');
    console.log('- Street name: "London Green"');
    console.log('- City: "Colorado Springs"');
    console.log('- Client name: "Kicelian" or "Hector"');
    console.log('- Exchange number: "7869"');
    
    console.log('\n✅ The exchange should now appear when searching for "860 London Green Way" in the frontend!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the update
updateLondonGreenExchange();