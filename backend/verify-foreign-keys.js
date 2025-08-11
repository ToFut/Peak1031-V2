require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verifyForeignKeys() {
  console.log('🔍 Verifying foreign key status...\n');
  
  try {
    // Test 1: Try to insert a document with a user ID
    console.log('1️⃣ Testing document insert with user ID...');
    const { data: testUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', 'admin@peak1031.com')
      .single();
      
    if (!testUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log(`   Using user: ${testUser.email} (${testUser.id})`);
    
    // Try to insert
    const testDoc = {
      original_filename: 'fk-test.txt',
      stored_filename: 'fk-test.txt', 
      file_path: 'test/fk-test.txt',
      file_size: 100,
      mime_type: 'text/plain',
      exchange_id: 'df7ea956-a936-45c6-b683-143e9dda5230',
      uploaded_by: testUser.id,
      category: 'test'
    };
    
    const { data: insertedDoc, error: insertError } = await supabase
      .from('documents')
      .insert([testDoc])
      .select()
      .single();
      
    if (insertError) {
      console.log('❌ Insert failed:', insertError.message);
      if (insertError.message.includes('people')) {
        console.log('   ⚠️  Foreign key still references people table!');
      }
    } else {
      console.log('✅ Document inserted successfully!');
      console.log('   Document ID:', insertedDoc.id);
      
      // Clean up
      await supabase.from('documents').delete().eq('id', insertedDoc.id);
      console.log('   🧹 Test document cleaned up');
    }
    
    // Test 2: Check if people table is still being used
    console.log('\n2️⃣ Checking if people table is still needed...');
    
    // Count records in people table
    const { count: peopleCount, error: peopleError } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true });
      
    if (peopleError) {
      console.log('✅ People table not accessible or deleted');
    } else {
      console.log(`⚠️  People table still exists with ${peopleCount} records`);
      console.log('   This table can be safely deleted after migration verification');
    }
    
    // Test 3: Try other tables
    console.log('\n3️⃣ Testing other foreign keys...');
    
    const tables = [
      { table: 'document_templates', column: 'created_by' },
      { table: 'tasks', column: 'assigned_to' },
      { table: 'audit_logs', column: 'user_id' }
    ];
    
    for (const { table, column } of tables) {
      try {
        // Try to insert with user ID
        const testData = {
          [column]: testUser.id,
          // Add required fields based on table
          ...(table === 'tasks' && { 
            title: 'FK Test Task',
            status: 'pending',
            exchange_id: 'df7ea956-a936-45c6-b683-143e9dda5230'
          }),
          ...(table === 'audit_logs' && {
            action: 'FK_TEST',
            entity_type: 'test',
            entity_id: 'test-123'
          }),
          ...(table === 'document_templates' && {
            name: 'FK Test Template',
            description: 'Test',
            category: 'test'
          })
        };
        
        const { error } = await supabase
          .from(table)
          .insert([testData]);
          
        if (error) {
          console.log(`   ❌ ${table}.${column}: ${error.message.substring(0, 50)}...`);
        } else {
          console.log(`   ✅ ${table}.${column}: Works with users table`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${table}: ${error.message}`);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log('   If all tests passed, the migration was successful!');
    console.log('   The people table is no longer needed and can be deleted.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit();
  }
}

verifyForeignKeys();