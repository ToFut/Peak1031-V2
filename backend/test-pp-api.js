require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 TESTING PRACTICEPANTHER API DIRECTLY\n');

async function testAPI() {
  try {
    // Get the stored token
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { data: tokens, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', 'practicepanther')
      .eq('is_active', true)
      .limit(1);

    if (error || !tokens || tokens.length === 0) {
      console.log('❌ No active token found');
      return;
    }

    const token = tokens[0];
    console.log('✅ Using stored token');

    // Test contacts endpoint with different parameters
    console.log('\n👥 Testing contacts endpoint...');
    
    const contactsResponse = await fetch('https://app.practicepanther.com/api/v2/contacts?per_page=10&page=1', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Contacts response status:', contactsResponse.status);
    
    if (contactsResponse.ok) {
      const contactsData = await contactsResponse.json();
      console.log('Contacts response:', JSON.stringify(contactsData, null, 2));
    } else {
      const errorText = await contactsResponse.text();
      console.log('Contacts error:', errorText);
    }

    // Test matters endpoint
    console.log('\n📄 Testing matters endpoint...');
    
    const mattersResponse = await fetch('https://app.practicepanther.com/api/v2/matters?per_page=10&page=1', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('Matters response status:', mattersResponse.status);
    
    if (mattersResponse.ok) {
      const mattersData = await mattersResponse.json();
      console.log('Matters response:', JSON.stringify(mattersData, null, 2));
    } else {
      const errorText = await mattersResponse.text();
      console.log('Matters error:', errorText);
    }

    // Test user info
    console.log('\n👤 Testing user info...');
    
    const userResponse = await fetch('https://app.practicepanther.com/api/v2/users/me', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('User response status:', userResponse.status);
    
    if (userResponse.ok) {
      const userData = await userResponse.json();
      console.log('User info:', JSON.stringify(userData, null, 2));
    } else {
      const errorText = await userResponse.text();
      console.log('User error:', errorText);
    }

  } catch (error) {
    console.log('❌ API test failed:', error.message);
  }
}

testAPI(); 