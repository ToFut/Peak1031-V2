const PPTokenManager = require('./services/ppTokenManager');
const axios = require('axios');

async function testRealPPAPI() {
  try {
    console.log('🔍 Testing REAL PracticePanther API...');
    
    const tokenManager = new PPTokenManager();
    const storedToken = await tokenManager.getStoredToken();
    
    if (!storedToken) {
      console.error('❌ No stored token found');
      return;
    }
    
    console.log('✅ Found stored token');
    console.log('   Token expires at:', storedToken.expires_at);
    console.log('   Token type:', storedToken.token_type);
    console.log('   Has refresh token:', !!storedToken.refresh_token);
    
    // Test a few PP API endpoints
    const endpoints = [
      { url: 'https://app.practicepanther.com/api/v2/user', name: 'User Info' },
      { url: 'https://app.practicepanther.com/api/v2/contacts?limit=1', name: 'Contacts' },
      { url: 'https://app.practicepanther.com/api/v2/accounts?limit=1', name: 'Accounts' },
      { url: 'https://app.practicepanther.com/api/v2/matters?limit=1', name: 'Matters' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`\n🔍 Testing ${endpoint.name}: ${endpoint.url}`);
        
        const response = await axios.get(endpoint.url, {
          headers: {
            'Authorization': `Bearer ${storedToken.access_token}`,
            'Accept': 'application/json'
          },
          timeout: 10000
        });
        
        console.log(`✅ ${endpoint.name} - Status: ${response.status}`);
        
        if (response.data && Array.isArray(response.data)) {
          console.log(`   📊 Items returned: ${response.data.length}`);
          if (response.data.length > 0) {
            console.log(`   📋 First item keys: ${Object.keys(response.data[0]).join(', ')}`);
          }
        } else if (response.data && typeof response.data === 'object') {
          console.log(`   📋 Response keys: ${Object.keys(response.data).join(', ')}`);
        }
        
        break; // Stop after first success to confirm API is working
        
      } catch (error) {
        console.log(`❌ ${endpoint.name} - Error: ${error.response?.status} ${error.response?.statusText || error.message}`);
        if (error.response?.data) {
          console.log(`   Details: ${JSON.stringify(error.response.data)}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRealPPAPI();