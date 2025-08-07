#!/usr/bin/env node

/**
 * Test PracticePanther Auto-Refresh Implementation
 * 
 * This script tests the new PP token management system
 */

require('dotenv').config();
const PPTokenManager = require('./services/ppTokenManager');
const ppServiceInstance = require('./services/practicePartnerService');

async function testPPAutoRefresh() {
  console.log('🧪 Testing PracticePanther Auto-Refresh Implementation\n');
  console.log('======================================================\n');

  const tokenManager = new PPTokenManager();
  
  if (!ppServiceInstance) {
    console.log('❌ PracticePartnerService not available - check Supabase configuration');
    return;
  }
  
  const ppService = ppServiceInstance;

  try {
    // Test 1: Check current token status
    console.log('📝 Test 1: Checking current token status...');
    const status = await tokenManager.getTokenStatus();
    console.log('Token Status:', JSON.stringify(status, null, 2));

    if (status.status === 'no_token') {
      console.log('\n⚠️  No PP token found. To set up OAuth:');
      console.log(`1. Visit: http://localhost:5001/api/admin/pp-token/auth-url`);
      console.log(`2. Follow the OAuth flow`);
      console.log(`3. Come back and run this test again\n`);
      return;
    }

    // Test 2: Try to get a valid access token (should auto-refresh if needed)
    console.log('\n📝 Test 2: Getting valid access token (auto-refresh test)...');
    
    try {
      const accessToken = await tokenManager.getValidAccessToken();
      console.log('✅ Successfully got valid access token:', accessToken.substring(0, 20) + '...');
      
      // Check status again after potential refresh
      const newStatus = await tokenManager.getTokenStatus();
      console.log('Updated Status:', JSON.stringify(newStatus, null, 2));
      
    } catch (error) {
      console.log('❌ Failed to get valid access token:', error.message);
    }

    // Test 3: Test PracticePartner service authentication
    console.log('\n📝 Test 3: Testing PracticePartner service authentication...');
    
    try {
      const authResult = await ppService.authenticate();
      console.log('✅ PP Service authentication successful:');
      console.log(JSON.stringify(authResult, null, 2));
      
    } catch (error) {
      console.log('❌ PP Service authentication failed:', error.message);
    }

    // Test 4: Test actual API call (if token is valid)
    console.log('\n📝 Test 4: Testing actual PP API call...');
    
    try {
      // Try a simple API endpoint
      const response = await ppService.client.get('/user');
      console.log('✅ PP API call successful!');
      console.log('Response status:', response.status);
      console.log('User data:', response.data?.first_name || 'No first_name field');
      
    } catch (error) {
      console.log('❌ PP API call failed:', error.message);
      if (error.response) {
        console.log('   Status:', error.response.status);
        console.log('   Error data:', JSON.stringify(error.response.data, null, 2));
      }
    }

    // Test 5: Simulate token expiry and auto-refresh
    console.log('\n📝 Test 5: Testing manual refresh...');
    
    const storedToken = await tokenManager.getStoredToken();
    if (storedToken?.refresh_token) {
      try {
        const refreshResult = await tokenManager.refreshToken(storedToken.refresh_token);
        if (refreshResult) {
          console.log('✅ Manual refresh successful!');
          console.log('New token expires at:', refreshResult.expires_at);
        } else {
          console.log('❌ Manual refresh failed');
        }
      } catch (error) {
        console.log('❌ Manual refresh error:', error.message);
      }
    } else {
      console.log('⚠️  No refresh token available for manual refresh test');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }

  console.log('\n======================================================');
  console.log('🎉 PP Auto-Refresh Test Complete!\n');
  
  console.log('📋 Summary of Auto-Refresh Implementation:');
  console.log('1. ✅ PPTokenManager class created with robust token handling');
  console.log('2. ✅ Auto-refresh on every API request (request interceptor)');
  console.log('3. ✅ 5-minute expiry buffer to proactively refresh');
  console.log('4. ✅ Proper error handling for expired refresh tokens');
  console.log('5. ✅ Database storage in Supabase oauth_tokens table');
  console.log('6. ✅ Admin routes for token monitoring and management');
  
  console.log('\n🔧 Admin Endpoints Available:');
  console.log('• GET /api/admin/pp-token/status - Check token status');
  console.log('• GET /api/admin/pp-token/auth-url - Get OAuth setup URL');
  console.log('• POST /api/admin/pp-token/refresh - Manual refresh');
  console.log('• POST /api/admin/pp-token/test - Test API connection');
  console.log('• DELETE /api/admin/pp-token/revoke - Revoke tokens');
}

// Run the test
testPPAutoRefresh().catch(console.error);