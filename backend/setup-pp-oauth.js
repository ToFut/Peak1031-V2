#!/usr/bin/env node

require('dotenv').config();
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupOAuth() {
  try {
    console.log('🔧 Setting up PracticePanther OAuth token...\n');
    
    const clientId = process.env.PP_CLIENT_ID;
    const clientSecret = process.env.PP_CLIENT_SECRET;
    const authCode = process.env.PP_AUTH_CODE;
    const redirectUri = process.env.PP_REDIRECT_URI || 'https://localhost:8000';
    
    if (!clientId || !clientSecret) {
      console.log('❌ Missing PP credentials in .env file');
      console.log('Required: PP_CLIENT_ID, PP_CLIENT_SECRET');
      return;
    }
    
    if (!authCode) {
      console.log('❌ No auth code found in .env file');
      console.log('💡 Please visit this URL to get an auth code:');
      console.log(`https://app.practicepanther.com/OAuth/Authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`);
      console.log('Then add PP_AUTH_CODE=your_code to your .env file');
      return;
    }
    
    console.log('🔑 Exchanging auth code for access token...');
    
    // Exchange auth code for access token (using form data as PP expects)
    const formData = new URLSearchParams();
    formData.append('grant_type', 'authorization_code');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('code', authCode);
    formData.append('redirect_uri', redirectUri);
    
    const tokenResponse = await axios.post('https://app.practicepanther.com/OAuth/Token', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      }
    });
    
    const tokenData = tokenResponse.data;
    console.log('✅ Access token received!');
    console.log(`   Token type: ${tokenData.token_type || 'Bearer'}`);
    console.log(`   Expires in: ${tokenData.expires_in || 'No expiry'} seconds`);
    
    // Calculate expiry date
    const expiresAt = tokenData.expires_in 
      ? new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString()
      : null;
    
    // Store token in database
    console.log('💾 Storing token in database...');
    const { data, error } = await supabase
      .from('oauth_tokens')
      .insert({
        provider: 'practicepanther',
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        token_type: tokenData.token_type || 'Bearer',
        expires_at: expiresAt,
        scope: tokenData.scope || null,
        is_active: true,
        provider_data: tokenData
      })
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error storing token:', error.message);
      return;
    }
    
    console.log('✅ Token stored successfully!');
    console.log(`   Token ID: ${data.id}`);
    console.log(`   Created: ${data.created_at}`);
    
    // Test the token
    console.log('\n🧪 Testing token with PP API...');
    try {
      const testResponse = await axios.get('https://app.practicepanther.com/api/v2/contacts', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Accept': 'application/json'
        },
        params: {
          limit: 1 // Just get 1 contact to test
        }
      });
      
      console.log('✅ Token test successful!');
      console.log(`   API responded with ${testResponse.data.data?.length || 0} contacts`);
      
      console.log('\n🎉 OAuth setup complete! You can now run PP sync.');
      
    } catch (testError) {
      console.error('❌ Token test failed:', testError.response?.data || testError.message);
      console.log('💡 Token was stored but may not be working correctly');
    }
    
  } catch (error) {
    console.error('❌ OAuth setup failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

setupOAuth().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});