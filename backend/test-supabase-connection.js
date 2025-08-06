require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    console.log('📋 Supabase URL:', supabaseUrl ? 'Set' : 'Not set');
    console.log('🔑 Supabase Key:', supabaseKey ? 'Set' : 'Not set');
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Supabase credentials not configured');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client created');
    
    // Test connection by trying to list tables
    console.log('🔍 Testing database connection...');
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log('❌ Supabase connection error:', error.message);
      console.log('   This might mean the tables don\'t exist yet');
      return;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log('📊 Data:', data);
    
  } catch (error) {
    console.error('❌ Error testing Supabase:', error.message);
  }
}

testSupabaseConnection(); 