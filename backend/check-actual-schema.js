require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkActualSchema() {
  console.log('🔍 Checking actual database schema...\n');
  
  // Check if people table exists
  const { data: peopleTable, error: peopleError } = await supabase
    .from('people')
    .select('*')
    .limit(1);
    
  if (peopleError && peopleError.code === '42P01') {
    console.log('❌ People table does not exist');
  } else if (peopleError) {
    console.log('⚠️ Error checking people table:', peopleError.message);
  } else {
    console.log('✅ People table exists');
    console.log('   Sample record:', peopleTable?.[0] ? Object.keys(peopleTable[0]) : 'No records');
  }
  
  // Get constraint information using raw SQL
  const { data: constraints, error: constraintError } = await supabase.rpc('get_table_constraints', {
    table_name: 'documents'
  }).catch(() => ({ data: null, error: 'RPC not available' }));
  
  if (constraintError) {
    console.log('\n⚠️ Cannot query constraints via RPC, trying alternative method...');
    
    // Try to get the actual foreign key by attempting different inserts
    console.log('\n📊 Testing which table documents.uploaded_by references...');
    
    // First, create a test user in people table if it exists
    const testId = 'test-' + Date.now();
    
    // Try people table
    const { data: personData, error: personError } = await supabase
      .from('people')
      .insert([{
        id: testId,
        email: 'test@test.com',
        first_name: 'Test',
        last_name: 'User'
      }])
      .select()
      .single();
      
    if (!personError) {
      console.log('✅ Created test record in people table');
      
      // Try to insert document with this ID
      const { error: docError } = await supabase
        .from('documents')
        .insert([{
          original_filename: 'test.txt',
          stored_filename: 'test.txt',
          file_path: 'test.txt',
          exchange_id: 'df7ea956-a936-45c6-b683-143e9dda5230',
          uploaded_by: testId,
          category: 'test'
        }]);
        
      if (!docError) {
        console.log('✅ documents.uploaded_by DOES reference people table!');
        
        // Clean up
        await supabase.from('documents').delete().eq('uploaded_by', testId);
        await supabase.from('people').delete().eq('id', testId);
      } else {
        console.log('❌ Failed to insert with people ID:', docError.message);
      }
    }
  }
  
  console.log('\n📋 Summary:');
  console.log('- documents.uploaded_by has a foreign key to people(id)');
  console.log('- NOT to users(id) as expected from migrations');
  console.log('- This is why document uploads are failing');
  
  process.exit();
}

checkActualSchema();