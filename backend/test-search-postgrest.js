require('dotenv').config({ path: __dirname + '/.env' });
const supabaseService = require('./services/supabase');

async function testSearch() {
  console.log('Testing PostgREST search queries...\n');
  
  const searchQueries = [
    'segev',
    '7869',
    'Kicelian',
    '7869 - Kicelian, Hector'
  ];
  
  for (const searchQuery of searchQueries) {
    console.log(`\n=== Testing search: "${searchQuery}" ===`);
    
    // Test 1: Simple wildcard search
    console.log('Test 1: Simple wildcard with %');
    try {
      const query1 = supabaseService.client
        .from('exchanges')
        .select('id, name, exchange_number')
        .or(`name.ilike.%${searchQuery}%,exchange_number.ilike.%${searchQuery}%`)
        .limit(5);
      
      const { data, error } = await query1;
      if (error) {
        console.log('❌ Error with % wildcard:', error.message);
      } else {
        console.log(`✅ Found ${data?.length || 0} results with % wildcard`);
      }
    } catch (err) {
      console.log('❌ Exception:', err.message);
    }
    
    // Test 2: PostgREST * wildcard
    console.log('\nTest 2: PostgREST wildcard with *');
    try {
      const query2 = supabaseService.client
        .from('exchanges')
        .select('id, name, exchange_number')
        .or(`name.ilike.*${searchQuery}*,exchange_number.ilike.*${searchQuery}*`)
        .limit(5);
      
      const { data, error } = await query2;
      if (error) {
        console.log('❌ Error with * wildcard:', error.message);
      } else {
        console.log(`✅ Found ${data?.length || 0} results with * wildcard`);
      }
    } catch (err) {
      console.log('❌ Exception:', err.message);
    }
    
    // Test 3: URL encoded search
    const encodedQuery = encodeURIComponent(searchQuery);
    console.log(`\nTest 3: URL encoded: "${encodedQuery}"`);
    try {
      const query3 = supabaseService.client
        .from('exchanges')
        .select('id, name, exchange_number')
        .or(`name.ilike.*${encodedQuery}*,exchange_number.ilike.*${encodedQuery}*`)
        .limit(5);
      
      const { data, error } = await query3;
      if (error) {
        console.log('❌ Error with encoded query:', error.message);
      } else {
        console.log(`✅ Found ${data?.length || 0} results with encoded query`);
        if (data?.length > 0) {
          console.log('First result:', data[0]);
        }
      }
    } catch (err) {
      console.log('❌ Exception:', err.message);
    }
  }
  
  // Test what's actually in the database
  console.log('\n=== Checking actual data ===');
  const { data: sampleData } = await supabaseService.client
    .from('exchanges')
    .select('id, name, exchange_number, pp_name, pp_display_name')
    .limit(5);
  
  console.log('Sample exchanges in database:');
  sampleData?.forEach(ex => {
    console.log(`- ${ex.exchange_number}: ${ex.name || ex.pp_name || ex.pp_display_name || 'No name'}`);
  });
}

testSearch().catch(console.error);