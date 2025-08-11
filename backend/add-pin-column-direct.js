const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function addPinColumnDirect() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  try {
    console.log('🔄 Testing database connection...');
    
    // First, test basic connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (testError) {
      console.log('❌ Database connection error:', testError);
      return;
    }
    
    console.log('✅ Database connection successful');
    
    // Check if column already exists by trying to select it
    const { data: columnTest, error: columnError } = await supabase
      .from('users')
      .select('default_document_pin')
      .limit(1);
    
    if (!columnError) {
      console.log('✅ Column already exists!');
      console.log('   Test data:', columnTest[0]);
    } else if (columnError.code === '42703') {
      console.log('🔄 Column does not exist, need to add it manually via Supabase dashboard');
      console.log('   Please add the column via SQL Editor in Supabase:');
      console.log('   ALTER TABLE users ADD COLUMN default_document_pin VARCHAR(10);');
    } else {
      console.log('❌ Unexpected error:', columnError);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

addPinColumnDirect();