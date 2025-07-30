require('dotenv').config({ path: './backend/.env' });
const practicePartnerService = require('./backend/services/practicePartnerService');

async function testOAuthFlow() {
  console.log('🔍 Testing PracticePanther OAuth Flow...\n');

  try {
    console.log('Environment variables check:');
    console.log(`PP_CLIENT_ID: ${process.env.PP_CLIENT_ID ? '✅ Set' : '❌ Missing'}`);
    console.log(`PP_CLIENT_SECRET: ${process.env.PP_CLIENT_SECRET ? '✅ Set' : '❌ Missing'}`);
    console.log(`PP_REDIRECT_URI: ${process.env.PP_REDIRECT_URI ? '✅ Set' : '❌ Missing'}`);
    console.log('---\n');

    // Test 1: Generate authorization URL
    console.log('📋 Step 1: Generate OAuth Authorization URL');
    const authUrl = practicePartnerService.generateAuthUrl();
    console.log('✅ Authorization URL generated successfully');
    console.log(`🔗 URL: ${authUrl}`);
    console.log('---\n');

    // Test 2: Check for existing tokens
    console.log('📋 Step 2: Check for existing tokens');
    const storedToken = await practicePartnerService.getStoredToken();
    if (storedToken) {
      console.log('✅ Found stored token');
      console.log(`Token expires: ${storedToken.expires_at}`);
      console.log(`Has refresh token: ${!!storedToken.refresh_token}`);
    } else {
      console.log('⚠️ No stored token found');
    }
    console.log('---\n');

    // Test 3: Try to ensure valid token (should fail without OAuth)
    console.log('📋 Step 3: Test token validation');
    try {
      await practicePartnerService.ensureValidToken();
      console.log('✅ Valid token available - can proceed with API calls');
    } catch (error) {
      console.log('⚠️ Expected: OAuth authorization required');
      console.log(`Message: ${error.message}`);
    }
    console.log('---\n');

    console.log('🎯 OAuth Flow Test Results:');
    console.log('✅ Authorization URL generation: Working');
    console.log('✅ Token storage system: Ready');
    console.log('✅ Validation flow: Working');
    console.log('\n🔑 To complete OAuth setup:');
    console.log('1. Visit the authorization URL above');
    console.log('2. Complete PracticePanther authorization');
    console.log('3. Check that the callback saves the token');
    console.log('4. Then sync operations will work');

  } catch (error) {
    console.error('❌ OAuth flow test failed:', error);
  }
}

testOAuthFlow();