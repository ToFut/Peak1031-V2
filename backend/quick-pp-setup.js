require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

console.log('⚡ QUICK PRACTICEPANTHER SETUP\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function quickSetup() {
  try {
    const PP_CLIENT_ID = process.env.PP_CLIENT_ID;
    const PP_CLIENT_SECRET = process.env.PP_CLIENT_SECRET;
    const PP_AUTH_CODE = process.env.PP_AUTH_CODE;
    
    console.log('📋 Current Configuration:');
    console.log('- PP_CLIENT_ID:', PP_CLIENT_ID ? '✅ Present' : '❌ Missing');
    console.log('- PP_CLIENT_SECRET:', PP_CLIENT_SECRET ? '✅ Present' : '❌ Missing');
    console.log('- PP_AUTH_CODE:', PP_AUTH_CODE ? '✅ Present' : '❌ Missing');

    if (!PP_CLIENT_ID || !PP_CLIENT_SECRET) {
      console.log('\n❌ Missing credentials');
      return;
    }

    if (!PP_AUTH_CODE) {
      console.log('\n❌ No auth code found');
      console.log('Please get a fresh auth code from PracticePanther');
      return;
    }

    console.log('\n🔄 Exchanging auth code for token...');
    
    // Use the exact parameters that should work
    const formData = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: PP_CLIENT_ID,
      client_secret: PP_CLIENT_SECRET,
      code: PP_AUTH_CODE,
      redirect_uri: 'https://localhost:8000'
    });

    const response = await fetch('https://app.practicepanther.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Token exchange failed:', response.status);
      console.log('Error:', errorText);
      
      if (response.status === 400) {
        console.log('\n🔑 The auth code has expired or is invalid');
        console.log('You need to get a fresh auth code from PracticePanther');
        console.log('\n🔗 Quick authorization URL:');
        console.log('https://app.practicepanther.com/oauth/authorize?client_id=c1ba43b4-155b-4a69-90cb-55cf7f1e7f41&response_type=code&redirect_uri=https%3A%2F%2Flocalhost%3A8000&state=quick&scope=contacts+matters+tasks');
      }
      return;
    }

    const tokenData = await response.json();
    console.log('✅ Token exchange successful!');
    console.log('- Access token received');
    console.log('- Expires in:', tokenData.expires_in, 'seconds');
    
    console.log('\n💾 Storing token in database...');
    
    // First delete any existing tokens for this provider
    await supabase
      .from('oauth_tokens')
      .delete()
      .eq('provider', 'practicepanther');

    // Then insert the new token
    const { data, error } = await supabase
      .from('oauth_tokens')
      .insert({
        provider: 'practicepanther',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        scope: tokenData.scope || '',
        is_active: true
      });

    if (error) {
      console.log('❌ Error storing token:', error.message);
      return;
    }

    console.log('✅ Token stored successfully!');
    
    console.log('\n🧪 Testing connection...');
    
    const testResponse = await fetch('https://app.practicepanther.com/api/v2/contacts?limit=1', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!testResponse.ok) {
      console.log('❌ Connection test failed:', testResponse.status);
      return;
    }

    const testData = await testResponse.json();
    console.log('✅ Connection successful!');
    console.log('- Available contacts:', testData.total_count || 'Unknown');
    
    console.log('\n🎉 PracticePanther setup complete!');
    console.log('You can now run data sync operations.');
    console.log('\nNext: node run-pp-sync.js');

  } catch (error) {
    console.log('❌ Setup failed:', error.message);
  }
}

quickSetup(); 