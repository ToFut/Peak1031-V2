require('dotenv').config({ path: '../.env' });

console.log('🧪 TESTING PRACTICEPANTHER CONNECTION (GET-ONLY)\n');

async function testPPConnection() {
  try {
    // Check if we have any stored tokens first
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    console.log('🔍 Checking for existing tokens...');
    
    const { data: tokens, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', 'practicepanther')
      .eq('is_active', true)
      .limit(1);

    if (error) {
      console.log('❌ Error checking tokens:', error.message);
      return;
    }

    if (!tokens || tokens.length === 0) {
      console.log('❌ No active tokens found');
      console.log('We need to set up OAuth authentication first.');
      console.log('\n📝 To proceed:');
      console.log('1. The auth code you provided may have expired');
      console.log('2. We need to get a fresh auth code from PracticePanther');
      console.log('3. Then exchange it for an access token');
      console.log('\n🔗 Quick authorization URL:');
      console.log('https://app.practicepanther.com/oauth/authorize?client_id=c1ba43b4-155b-4a69-90cb-55cf7f1e7f41&response_type=code&redirect_uri=https%3A%2F%2Flocalhost%3A8000&state=test&scope=contacts+matters+tasks');
      return;
    }

    const token = tokens[0];
    console.log('✅ Found active token');
    console.log('- Expires:', token.expires_at);
    
    // Test the connection with a simple GET request
    console.log('\n🧪 Testing API connection...');
    
    const response = await fetch('https://app.practicepanther.com/api/v2/contacts?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('❌ API test failed:', response.status, response.statusText);
      
      if (response.status === 401) {
        console.log('🔑 Token appears to be invalid or expired');
        console.log('We need to refresh the token or get a new auth code');
      }
      
      return;
    }

    const data = await response.json();
    console.log('✅ API connection successful!');
    console.log('- Available contacts:', data.total_count || 'Unknown');
    
    if (data.contacts && data.contacts.length > 0) {
      console.log('\n📋 Sample contact data:');
      const contact = data.contacts[0];
      console.log(`- Name: ${contact.first_name} ${contact.last_name}`);
      console.log(`- Email: ${contact.email || 'No email'}`);
      console.log(`- Company: ${contact.company || 'No company'}`);
    }

    // Test matters endpoint
    console.log('\n📄 Testing matters endpoint...');
    
    const mattersResponse = await fetch('https://app.practicepanther.com/api/v2/matters?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (mattersResponse.ok) {
      const mattersData = await mattersResponse.json();
      console.log('✅ Matters endpoint accessible');
      console.log('- Available matters:', mattersData.total_count || 'Unknown');
    } else {
      console.log('❌ Matters endpoint failed:', mattersResponse.status);
    }

    console.log('\n🎉 PracticePanther connection is working!');
    console.log('You can now run data sync operations.');
    console.log('\nNext steps:');
    console.log('1. Run: node run-pp-sync.js (to test sync)');
    console.log('2. Set up automated sync scheduling');
    console.log('3. Start using the application with your PP data');

  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
  }
}

testPPConnection(); 