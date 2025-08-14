const axios = require('axios');

const testToken = 'be24c1c62f3e6e144f85ba604904c65965566bf98567139e51a1f033bcb78e83';
const productionUrl = 'https://peak1031-v2-8uus.vercel.app';

async function testProductionAPI() {
  console.log('🔍 Testing production API routing after latest fixes...');
  
  try {
    // 1. Test API health endpoint
    console.log('\n1️⃣ Testing API health endpoint...');
    try {
      const healthResponse = await axios.get(`${productionUrl}/api/health`, {
        timeout: 10000
      });
      console.log('✅ Health check:', healthResponse.status, healthResponse.data);
    } catch (healthError) {
      console.log('❌ Health check error:', healthError.response?.status || healthError.message);
    }
    
    // 2. Test invitation details API
    console.log('\n2️⃣ Testing invitation details API...');
    try {
      const invitationResponse = await axios.get(`${productionUrl}/api/invitations/details/${testToken}`, {
        timeout: 10000
      });
      console.log('✅ Invitation API response:', invitationResponse.data);
    } catch (invitationError) {
      console.log('❌ Invitation API error:', invitationError.response?.status || invitationError.message);
      if (invitationError.response?.data) {
        console.log('❌ Error response data:', invitationError.response.data);
      }
    }
    
    // 3. Test if we're still getting HTML instead of API responses
    console.log('\n3️⃣ Checking for HTML responses (should be JSON)...');
    try {
      const rawResponse = await axios.get(`${productionUrl}/api/invitations/details/${testToken}`, {
        timeout: 10000,
        validateStatus: () => true // Don't throw on non-2xx status codes
      });
      
      const isHTML = typeof rawResponse.data === 'string' && rawResponse.data.includes('<!doctype html>');
      const isJSON = typeof rawResponse.data === 'object';
      
      console.log('Response analysis:');
      console.log('  - Status:', rawResponse.status);
      console.log('  - Is HTML:', isHTML);
      console.log('  - Is JSON:', isJSON);
      console.log('  - Content-Type:', rawResponse.headers['content-type']);
      
      if (isHTML) {
        console.log('🚨 PROBLEM: Still getting HTML instead of API response!');
        console.log('   This means Vercel routing is not fixed yet.');
      }
    } catch (rawError) {
      console.log('❌ Raw request error:', rawError.message);
    }
    
    // 4. Test a few more API endpoints to see the pattern
    console.log('\n4️⃣ Testing other API endpoints...');
    
    const testEndpoints = [
      '/api',
      '/api/auth/validate',
    ];
    
    for (const endpoint of testEndpoints) {
      try {
        const response = await axios.get(`${productionUrl}${endpoint}`, {
          timeout: 5000,
          validateStatus: () => true
        });
        
        const isHTML = typeof response.data === 'string' && response.data.includes('<!doctype html>');
        console.log(`  ${endpoint}: Status ${response.status}, HTML: ${isHTML}`);
      } catch (error) {
        console.log(`  ${endpoint}: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ General error:', error.message);
  }
}

testProductionAPI().catch(console.error);