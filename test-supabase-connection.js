require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
  console.log('🔍 TESTING SUPABASE CONNECTION\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
  console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
  console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.log('\n❌ Missing required environment variables');
    return;
  }
  
  console.log('\n🔗 Testing connection...');
  
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    // Try a simple query to test connection
    const { data, error } = await supabase
      .from('_supabase_migrations')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Connection failed:', error.message);
      
      if (error.message.includes('Invalid API key')) {
        console.log('\n🔧 DIAGNOSIS: Invalid API Key');
        console.log('Possible causes:');
        console.log('1. Service key is expired or invalid');
        console.log('2. Key is split across multiple lines in .env file');
        console.log('3. Project has been deleted or suspended');
        console.log('4. Wrong key type (using anon key instead of service key)');
        
        console.log('\n💡 SOLUTION:');
        console.log('1. Go to https://supabase.com/dashboard');
        console.log('2. Select your project');
        console.log('3. Go to Settings → API');
        console.log('4. Copy the "service_role" key (not anon key)');
        console.log('5. Update your .env file');
      }
    } else {
      console.log('✅ Connection successful!');
      console.log('✅ Supabase project is accessible');
      console.log('✅ Service key is valid');
    }
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
  }
}

testConnection(); 