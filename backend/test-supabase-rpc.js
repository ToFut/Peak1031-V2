require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseRPC() {
  console.log('=== TESTING SUPABASE RPC FUNCTION ===\n');
  
  // Check environment variables
  console.log('1. Checking environment variables:');
  console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Not set');
  console.log('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Not set');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('\n❌ Supabase credentials not configured!');
    console.log('   Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file');
    return;
  }
  
  // Create Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  console.log('\n2. Testing execute_safe_query RPC function:');
  
  // Test the specific query
  const testQuery = `
    SELECT COUNT(DISTINCT e.id) as count, 'name_search' as type
    FROM exchanges e
    LEFT JOIN contacts c ON e.client_id = c.id
    LEFT JOIN users u ON e.coordinator_id = u.id
    WHERE (
      e.name ILIKE '%Katzovitz%' OR 
      c.first_name ILIKE '%Katzovitz%' OR 
      c.last_name ILIKE '%Katzovitz%' OR 
      c.company ILIKE '%Katzovitz%' OR
      CONCAT(c.first_name, ' ', c.last_name) ILIKE '%Katzovitz%'
    ) OR (
      e.name ILIKE '%Yechiel%' OR 
      c.first_name ILIKE '%Yechiel%' OR 
      c.last_name ILIKE '%Yechiel%' OR 
      c.company ILIKE '%Yechiel%' OR
      CONCAT(c.first_name, ' ', c.last_name) ILIKE '%Yechiel%'
    )
  `;
  
  try {
    console.log('   Executing query for Katzovitz/Yechiel...');
    const { data, error } = await supabase.rpc('execute_safe_query', {
      query_text: testQuery
    });
    
    if (error) {
      console.error('   ❌ RPC function error:', error.message);
      console.error('   Error details:', error);
      
      if (error.message.includes('not found')) {
        console.log('\n⚠️  The execute_safe_query function may not exist in your database.');
        console.log('   Run this migration: /backend/database/migrations/027-create-safe-query-function.sql');
      }
    } else {
      console.log('   ✅ RPC function executed successfully!');
      console.log('   Results:', data);
      
      if (Array.isArray(data) && data.length > 0) {
        console.log(`   Count: ${data[0].count}`);
      }
    }
  } catch (err) {
    console.error('   ❌ Exception:', err.message);
  }
  
  // Test a simpler query
  console.log('\n3. Testing with a simple query:');
  try {
    const simpleQuery = 'SELECT COUNT(*) as total FROM exchanges';
    const { data, error } = await supabase.rpc('execute_safe_query', {
      query_text: simpleQuery
    });
    
    if (error) {
      console.error('   ❌ Simple query error:', error.message);
    } else {
      console.log('   ✅ Simple query successful!');
      console.log('   Total exchanges:', data?.[0]?.total || 0);
    }
  } catch (err) {
    console.error('   ❌ Exception:', err.message);
  }
}

testSupabaseRPC().catch(console.error);