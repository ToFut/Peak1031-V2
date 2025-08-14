const axios = require('axios');

// Test token from the URL
const testToken = 'be24c1c62f3e6e144f85ba604904c65965566bf98567139e51a1f033bcb78e83';

async function testLocalhostInvitation() {
  console.log('🔍 Testing invitation flow on localhost...');
  
  try {
    // 1. Test the invitation details API endpoint
    console.log('\n1️⃣ Testing invitation details API...');
    const apiResponse = await axios.get(`http://localhost:5001/api/invitations/details/${testToken}`);
    console.log('✅ API Response:', JSON.stringify(apiResponse.data, null, 2));
    
    // 2. Test the frontend invitation page (should work with our routing)
    console.log('\n2️⃣ Testing frontend invitation page...');
    try {
      const frontendResponse = await axios.get(`http://localhost:3000/invite/${testToken}`, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      const isHTML = frontendResponse.data.includes('<!doctype html>');
      const hasReactRoot = frontendResponse.data.includes('<div id="root">');
      const hasTitle = frontendResponse.data.includes('Peak 1031');
      
      console.log('✅ Frontend Response:');
      console.log('  - Is HTML:', isHTML);
      console.log('  - Has React root:', hasReactRoot);
      console.log('  - Has title:', hasTitle);
      console.log('  - Status:', frontendResponse.status);
      
      if (isHTML && hasReactRoot && hasTitle) {
        console.log('✅ Frontend invitation page loads correctly!');
      } else {
        console.log('❌ Frontend invitation page has issues');
      }
    } catch (frontendError) {
      console.log('❌ Frontend error:', frontendError.message);
    }
    
    // 3. Test a different invitation path format (just in case)
    console.log('\n3️⃣ Testing alternative invitation path...');
    try {
      const altResponse = await axios.get(`http://localhost:3000/onboarding/invitation/${testToken}`, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      console.log('✅ Alternative path also works (status:', altResponse.status, ')');
    } catch (altError) {
      console.log('⚠️ Alternative path error (expected):', altError.response?.status || altError.message);
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testLocalhostInvitation().catch(console.error);