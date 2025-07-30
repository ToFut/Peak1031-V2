require('dotenv').config({ path: './backend/.env' });
const practicePartnerService = require('./backend/services/practicePartnerService');

async function testAutoRefresh() {
  console.log('🔄 Testing Auto-Refresh Mechanism...\n');

  try {
    // First, manually set the token that we know works (but make it "expired")
    console.log('🔧 Setting up test scenario...');
    practicePartnerService.accessToken = '00xymrV9BEUoXPviItXSAmrKTmdgv2ErgBIwgg5Wec-oEz9Oe4yZFUxEAkubFJGRgzimcgKZEK36zuORz0nzSYfzmhrEQlqZUoT72DKftiBUMXqTUxDdF6yCTLv1gWnj6dF-uvcrpXSteKbMA-1u0wK2ZEPjRKyOTxlh7a9BJVYYLYNmuiHmmn4HJ6dXdPZMeqBi2IEzjIeSy-L9gInt803HepAq6I1qXVz-cYaYXCF7ALSaBKUmUM2zClifbQmsOrff-TzMAloqWf6YjB5JZ4JDCD_rBvcQVHTtcDBHB5v79T-IewCWsyf_cH48TSMs_G4hpoy9czi8XK21TjYKI659dZHl90xywb6SyQAEQ2uocfqAzUT4ajTFBPklO0i2II-cpxa2R0xFufeWLPx6OEm1DnJTkNV6WopBZCUsLuxFC9sdtGJdpLe-bkNnPWkSCBy5V-h3dnGK1Ep3vpsD1ZfU77QF5cu44xMnF1FnzAtd8hVrQvYUAcVAE4xjIucoOKKXrSFk1evHWgBH075HYdbXsbhuqosxcRLwNWJ-KCFYrH8XUbIWlzjhQX0AsmA';
    practicePartnerService.tokenExpiry = Date.now() - 1000; // Make it expired (1 second ago)
    
    console.log('✅ Token set to expired state');
    console.log(`Current time: ${new Date().toISOString()}`);
    console.log(`Token expires: ${new Date(practicePartnerService.tokenExpiry).toISOString()}`);
    console.log(`Is expired: ${Date.now() > practicePartnerService.tokenExpiry}`);
    console.log('---\n');

    // Now try to ensure valid token - this should trigger refresh
    console.log('🔄 Testing ensureValidToken (should trigger refresh)...');
    try {
      await practicePartnerService.ensureValidToken();
      console.log('✅ ensureValidToken succeeded');
      console.log(`New token expires: ${new Date(practicePartnerService.tokenExpiry).toISOString()}`);
    } catch (error) {
      console.log('⚠️ ensureValidToken failed (expected if no refresh token stored)');
      console.log(`Error: ${error.message}`);
    }
    console.log('---\n');

    // Test the refresh mechanism directly if we have a refresh token
    console.log('🔄 Testing refresh token directly...');
    const refreshToken = '4420de571d6a48ed81eab32b1c21269d'; // From our OAuth flow
    
    try {
      const newTokens = await practicePartnerService.refreshToken(refreshToken);
      if (newTokens) {
        console.log('✅ Token refresh successful!');
        console.log(`New access token: ${newTokens.access_token.substring(0, 20)}...`);
        console.log(`Expires in: ${newTokens.expires_in} seconds`);
        console.log(`New refresh token: ${newTokens.refresh_token ? 'Yes' : 'No'}`);
        
        // Now test API call with refreshed token
        console.log('\n🧪 Testing API call with refreshed token...');
        const testResult = await practicePartnerService.testConnection();
        console.log('✅ API call successful after refresh!');
        console.log(`Connected: ${testResult.connected}`);
        
      } else {
        console.log('❌ Token refresh failed');
      }
    } catch (refreshError) {
      console.log('❌ Token refresh error:', refreshError.message);
      if (refreshError.response?.data) {
        console.log('Refresh error details:', refreshError.response.data);
      }
    }

  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testAutoRefresh();