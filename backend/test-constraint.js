require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkConstraint() {
  // Check if user ID exists
  const userId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
  
  console.log('🔍 Checking foreign key constraint...\n');
  
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email')
    .eq('id', userId)
    .single();
    
  console.log('User exists in users table:', !!user);
  if (user) {
    console.log('User details:', { id: user.id, email: user.email });
  }
  
  console.log('\n🧪 Testing document insert...');
  
  // Try to insert a test document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .insert([{
      original_filename: 'test.txt',
      stored_filename: 'test-12345.txt',
      file_path: 'test/path.txt',
      file_size: 100,
      mime_type: 'text/plain',
      exchange_id: 'df7ea956-a936-45c6-b683-143e9dda5230',
      uploaded_by: userId,
      category: 'test'
    }])
    .select()
    .single();
    
  if (docError) {
    console.log('❌ Insert error:', docError.message);
    console.log('   Code:', docError.code);
    console.log('   Details:', docError.details);
    console.log('   Hint:', docError.hint);
  } else {
    console.log('✅ Document created successfully!');
    console.log('   Document ID:', doc.id);
    console.log('   Uploaded by:', doc.uploaded_by);
    
    // Clean up
    await supabase.from('documents').delete().eq('id', doc.id);
    console.log('🧹 Test document deleted');
  }
  
  process.exit();
}

checkConstraint();