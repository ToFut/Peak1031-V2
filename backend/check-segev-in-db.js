const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSegevInDb() {
  console.log('🔍 Checking if SEGEV DEMO exists in database...\n');
  
  // Direct query for SEGEV DEMO
  const { data: exchange, error } = await supabase
    .from('exchanges')
    .select('id, name, status, is_active, coordinator_id')
    .eq('id', 'ba7865ac-da20-404a-b609-804d15cb0467')
    .single();
    
  if (error) {
    console.error('Error querying exchange:', error);
    return;
  }
  
  if (exchange) {
    console.log('✅ SEGEV DEMO found in database:');
    console.log('- Name:', exchange.name);
    console.log('- Status:', exchange.status);
    console.log('- Is Active:', exchange.is_active);
    console.log('- Coordinator:', exchange.coordinator_id);
  } else {
    console.log('❌ SEGEV DEMO NOT found in database');
  }
  
  // Check first few active exchanges to compare
  console.log('\n📋 First 5 active exchanges:');
  const { data: activeExchanges } = await supabase
    .from('exchanges')
    .select('id, name, status, is_active')
    .eq('is_active', true)
    .limit(5);
    
  activeExchanges?.forEach(ex => {
    console.log(`- ${ex.name} (${ex.id.substring(0, 8)}...) - ${ex.status}`);
  });
  
  // Test the range query that might be failing
  console.log('\n🧪 Testing problematic range query (limit 5000):');
  try {
    const { data: rangeTest, error: rangeError } = await supabase
      .from('exchanges')
      .select('id, name')
      .eq('is_active', true)
      .range(0, 4999); // This is what happens with limit 5000
      
    if (rangeError) {
      console.error('❌ Range query error:', rangeError);
    } else {
      console.log('✅ Range query returned:', rangeTest?.length || 0, 'exchanges');
      
      // Check if SEGEV is in range results
      const hasSegev = rangeTest?.some(ex => ex.id === 'ba7865ac-da20-404a-b609-804d15cb0467');
      console.log('SEGEV in range results:', hasSegev ? '✅ Yes' : '❌ No');
    }
  } catch (err) {
    console.error('Range query exception:', err.message);
  }
  
  // Test without range
  console.log('\n🧪 Testing simple limit query (limit 5000):');
  try {
    const { data: simpleTest, error: simpleError } = await supabase
      .from('exchanges')
      .select('id, name')
      .eq('is_active', true)
      .limit(5000);
      
    if (simpleError) {
      console.error('❌ Simple limit query error:', simpleError);
    } else {
      console.log('✅ Simple limit query returned:', simpleTest?.length || 0, 'exchanges');
      
      // Check if SEGEV is in simple results
      const hasSegev = simpleTest?.some(ex => ex.id === 'ba7865ac-da20-404a-b609-804d15cb0467');
      console.log('SEGEV in simple results:', hasSegev ? '✅ Yes' : '❌ No');
    }
  } catch (err) {
    console.error('Simple query exception:', err.message);
  }
}

checkSegevInDb();