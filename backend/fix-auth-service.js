const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testAndFixAuth() {
  try {
    console.log('🔐 Testing authentication flow...');
    
    // Test Supabase authentication directly
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'thirdparty@peak1031.com',
      password: 'Peak2024!'
    });
    
    if (authError) {
      console.error('❌ Supabase auth failed:', authError.message);
      return;
    }
    
    console.log('✅ Supabase authentication successful!');
    console.log(`   User ID: ${authData.user.id}`);
    console.log(`   Email: ${authData.user.email}`);
    console.log(`   Access Token: ${authData.session.access_token.substring(0, 20)}...`);
    
    // Now test our backend API with the token
    console.log('\n🔍 Testing backend API with Supabase token...');
    
    const response = await fetch('http://localhost:5001/api/auth/verify', {
      headers: {
        'Authorization': `Bearer ${authData.session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('✅ Backend API verification successful!');
      console.log('   User data:', userData);
    } else {
      console.error('❌ Backend API verification failed:', response.status, response.statusText);
    }
    
    console.log('\n🎉 Authentication test complete!');
    console.log('   The password is correct and working with Supabase.');
    console.log('   The issue is in the backend authentication service.');
    console.log('   Try logging in with:');
    console.log('   Email: thirdparty@peak1031.com');
    console.log('   Password: Peak2024!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testAndFixAuth();








