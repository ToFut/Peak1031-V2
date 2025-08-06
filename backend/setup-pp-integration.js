require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// PracticePanther credentials
const PP_CLIENT_ID = process.env.PP_CLIENT_ID;
const PP_CLIENT_SECRET = process.env.PP_CLIENT_SECRET;
const PP_AUTH_CODE = process.env.PP_AUTH_CODE;
const PP_REDIRECT_URI = process.env.PP_REDIRECT_URI;

console.log('🔧 SETTING UP PRACTICEPANTHER INTEGRATION\n');

console.log('📋 Configuration Check:');
console.log('- PP_CLIENT_ID:', PP_CLIENT_ID ? '✅ Present' : '❌ Missing');
console.log('- PP_CLIENT_SECRET:', PP_CLIENT_SECRET ? '✅ Present' : '❌ Missing');
console.log('- PP_AUTH_CODE:', PP_AUTH_CODE ? '✅ Present' : '❌ Missing');
console.log('- PP_REDIRECT_URI:', PP_REDIRECT_URI || '❌ Missing');

if (!PP_CLIENT_ID || !PP_CLIENT_SECRET) {
  console.log('\n❌ Missing PracticePanther credentials!');
  console.log('Please add PP_CLIENT_ID and PP_CLIENT_SECRET to your .env file');
  process.exit(1);
}

async function exchangeCodeForToken() {
  console.log('\n🔄 Exchanging auth code for access token...');
  
  try {
    const response = await fetch('https://app.practicepanther.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: PP_CLIENT_ID,
        client_secret: PP_CLIENT_SECRET,
        code: PP_AUTH_CODE,
        redirect_uri: PP_REDIRECT_URI || 'https://localhost:8000'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Token exchange failed:', response.status, errorText);
      return null;
    }

    const tokenData = await response.json();
    console.log('✅ Token exchange successful!');
    console.log('- Access token received');
    console.log('- Expires in:', tokenData.expires_in, 'seconds');
    
    return tokenData;
  } catch (error) {
    console.log('❌ Error exchanging code for token:', error.message);
    return null;
  }
}

async function storeTokenInDatabase(tokenData) {
  console.log('\n💾 Storing token in database...');
  
  try {
    const { data, error } = await supabase
      .from('oauth_tokens')
      .upsert({
        provider: 'practicepanther',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_type: tokenData.token_type || 'Bearer',
        expires_at: new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString(),
        scope: tokenData.scope || '',
        is_active: true,
        created_by: null // Will be set by RLS or default
      }, {
        onConflict: 'provider'
      });

    if (error) {
      console.log('❌ Error storing token:', error.message);
      return false;
    }

    console.log('✅ Token stored successfully!');
    return true;
  } catch (error) {
    console.log('❌ Error storing token:', error.message);
    return false;
  }
}

async function testPPConnection() {
  console.log('\n🧪 Testing PracticePanther connection...');
  
  try {
    // Get the stored token
    const { data: tokens, error: tokenError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', 'practicepanther')
      .eq('is_active', true)
      .limit(1);

    if (tokenError || !tokens || tokens.length === 0) {
      console.log('❌ No active token found');
      return false;
    }

    const token = tokens[0];
    
    // Test API call
    const response = await fetch('https://app.practicepanther.com/api/v2/contacts?limit=1', {
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.log('❌ API test failed:', response.status, response.statusText);
      return false;
    }

    const data = await response.json();
    console.log('✅ API connection successful!');
    console.log('- Available contacts:', data.total_count || 'Unknown');
    
    return true;
  } catch (error) {
    console.log('❌ Connection test failed:', error.message);
    return false;
  }
}

async function setupIntegration() {
  if (!PP_AUTH_CODE) {
    console.log('\n❌ No auth code found!');
    console.log('You need to get an authorization code from PracticePanther first.');
    console.log('\n📝 To get an auth code:');
    console.log('1. Go to: https://app.practicepanther.com/oauth/authorize');
    console.log('2. Add these parameters:');
    console.log('   - client_id:', PP_CLIENT_ID);
    console.log('   - response_type=code');
    console.log('   - redirect_uri=', PP_REDIRECT_URI || 'https://localhost:8000');
    console.log('3. Copy the "code" parameter from the redirect URL');
    console.log('4. Add it to your .env file as PP_AUTH_CODE');
    return;
  }

  // Exchange code for token
  const tokenData = await exchangeCodeForToken();
  if (!tokenData) {
    console.log('\n❌ Failed to get access token');
    return;
  }

  // Store token in database
  const stored = await storeTokenInDatabase(tokenData);
  if (!stored) {
    console.log('\n❌ Failed to store token');
    return;
  }

  // Test connection
  const connected = await testPPConnection();
  if (!connected) {
    console.log('\n❌ Failed to test connection');
    return;
  }

  console.log('\n🎉 PracticePanther integration setup complete!');
  console.log('You can now run data sync operations.');
}

setupIntegration(); 