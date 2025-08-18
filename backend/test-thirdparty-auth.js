const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testThirdPartyAuth() {
  try {
    console.log('🔐 Testing third-party authentication...');
    console.log('   Email: thirdparty@peak1031.com');
    console.log('   Password: Peak2024!');
    
    // Test authentication
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'thirdparty@peak1031.com',
      password: 'Peak2024!'
    });
    
    if (error) {
      console.error('❌ Authentication failed:', error.message);
      console.error('   Error details:', error);
      return;
    }
    
    console.log('✅ Authentication successful!');
    console.log(`   User ID: ${data.user.id}`);
    console.log(`   Email: ${data.user.email}`);
    console.log(`   Role: ${data.user.user_metadata?.role || 'Not set'}`);
    console.log(`   Access Token: ${data.session.access_token.substring(0, 20)}...`);
    
    // Test getting user data from our API
    console.log('\n🔍 Testing API access...');
    
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/users?select=*&email=eq.thirdparty@peak1031.com`, {
      headers: {
        'Authorization': `Bearer ${data.session.access_token}`,
        'apikey': supabaseAnonKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const userData = await response.json();
      console.log('✅ API access successful!');
      console.log('   User data:', userData[0]);
    } else {
      console.error('❌ API access failed:', response.status, response.statusText);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testThirdPartyAuth();








