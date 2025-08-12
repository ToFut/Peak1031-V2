/**
 * Test Supabase query limits
 */

const supabaseService = require('./services/supabase');

async function testSupabaseLimit() {
  console.log('🚀 Testing Supabase query limits...\n');
  
  // Test 1: Query without count
  console.log('1️⃣ Query WITHOUT count:');
  const { data: dataNoCount, error: errorNoCount } = await supabaseService.client
    .from('exchanges')
    .select('id');
  
  console.log(`   - Returned rows: ${dataNoCount?.length || 0}`);
  
  // Test 2: Query with count: 'exact'
  console.log('\n2️⃣ Query WITH count: "exact":');
  const { data: dataWithCount, error: errorWithCount, count } = await supabaseService.client
    .from('exchanges')
    .select('id', { count: 'exact' });
  
  console.log(`   - Returned rows: ${dataWithCount?.length || 0}`);
  console.log(`   - Total count: ${count}`);
  
  // Test 3: Query with specific limit
  console.log('\n3️⃣ Query with limit 10:');
  const { data: dataLimit10, count: count10 } = await supabaseService.client
    .from('exchanges')
    .select('id', { count: 'exact' })
    .limit(10);
  
  console.log(`   - Returned rows: ${dataLimit10?.length || 0}`);
  console.log(`   - Total count: ${count10}`);
  
  // Test 4: Query with range
  console.log('\n4️⃣ Query with range(0, 5000):');
  const { data: dataRange, count: countRange } = await supabaseService.client
    .from('exchanges')
    .select('id', { count: 'exact' })
    .range(0, 5000);
  
  console.log(`   - Returned rows: ${dataRange?.length || 0}`);
  console.log(`   - Total count: ${countRange}`);
  
  // Test 5: Check actual total count
  console.log('\n5️⃣ Get actual count only:');
  const { count: actualCount, error: countError } = await supabaseService.client
    .from('exchanges')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   - Actual total count: ${actualCount}`);
  
  console.log('\n✅ Test completed');
}

// Run the test
testSupabaseLimit().catch(console.error);