#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const practicePartnerService = require('./services/practicePartnerService.js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAndRefreshToken() {
  try {
    console.log('🔍 Checking PracticePanther token status...\n');
    
    // Get current token
    const { data: token, error } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('provider', 'practicepanther')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !token) {
      console.log('❌ No token found in database');
      return;
    }
    
    const expiresAt = new Date(token.expires_at);
    const now = new Date();
    const isExpired = expiresAt < now;
    const hoursUntilExpiry = (expiresAt - now) / (1000 * 60 * 60);
    
    console.log('📊 Token Details:');
    console.log(`- Token ID: ${token.id}`);
    console.log(`- Has access token: ${!!token.access_token}`);
    console.log(`- Has refresh token: ${!!token.refresh_token}`);
    console.log(`- Created: ${new Date(token.created_at).toLocaleString()}`);
    console.log(`- Expires: ${expiresAt.toLocaleString()}`);
    console.log(`- Status: ${isExpired ? '❌ EXPIRED' : '✅ VALID'}`);
    console.log(`- Time until expiry: ${isExpired ? 'Already expired' : Math.round(hoursUntilExpiry) + ' hours'}`);
    
    if (!token.refresh_token) {
      console.log('\n❌ No refresh token available');
      console.log('A new OAuth flow is required to get a refresh token.');
      console.log('\nSteps:');
      console.log('1. Run: node generate-pp-auth-url.js');
      console.log('2. Complete authorization in browser');
      console.log('3. Update PP_AUTH_CODE in .env');
      console.log('4. Run: node setup-pp-oauth.js');
      return;
    }
    
    if (!isExpired && hoursUntilExpiry > 1) {
      console.log('\n✅ Token is still valid, no refresh needed');
      
      // Test the token
      console.log('\n🧪 Testing token with API...');
      try {
        await practicePartnerService.authenticate();
        console.log('✅ Token works correctly!');
      } catch (testError) {
        console.log('❌ Token test failed:', testError.message);
      }
      return;
    }
    
    // Token is expired or expiring soon, try to refresh
    console.log('\n🔄 Token needs refresh, attempting to refresh now...');
    
    try {
      // Force refresh by clearing current token
      practicePartnerService.accessToken = null;
      practicePartnerService.tokenExpiry = null;
      
      // This should trigger auto-refresh
      await practicePartnerService.ensureValidToken();
      
      console.log('✅ Token refreshed successfully!');
      
      // Get the updated token
      const { data: newToken } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('provider', 'practicepanther')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (newToken) {
        const newExpiresAt = new Date(newToken.expires_at);
        console.log(`\n📊 New Token Details:`);
        console.log(`- New expiry: ${newExpiresAt.toLocaleString()}`);
        console.log(`- Valid for: ${Math.round((newExpiresAt - new Date()) / (1000 * 60 * 60))} hours`);
      }
      
    } catch (refreshError) {
      console.error('\n❌ Token refresh failed:', refreshError.message);
      console.log('\nThe refresh token might be invalid or expired.');
      console.log('You need to complete a new OAuth flow.');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAndRefreshToken().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});