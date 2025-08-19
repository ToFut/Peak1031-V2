const axios = require('axios');

async function testCurrentInvitation() {
  console.log('🔍 Testing current invitation issue...');
  
  try {
    // Login to get a valid token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('👤 User info:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    // Test with the exact data from your logs
    const exchangeId = '6b835be2-8f41-4d35-b829-83e47f1f18ca';
    const testData = {
      invitations: [{
        email: "segev@futurixs.com",
        phone: "2137086881",
        role: "client",
        method: "email",
        firstName: "",
        lastName: ""
      }],
      message: ""
    };
    
    console.log('\n📤 Sending invitation with data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(
      `http://localhost:5001/api/invitations/${exchangeId}/send`,
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('\n✅ Success! Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('\n❌ Error occurred:');
    console.log('Status:', error.response?.status);
    console.log('Status Text:', error.response?.statusText);
    console.log('Error Message:', error.response?.data?.error || error.message);
    console.log('Full Response:', JSON.stringify(error.response?.data, null, 2));
    
    if (error.response?.data?.results) {
      console.log('\n📋 Invitation Results:');
      error.response.data.results.forEach((result, index) => {
        console.log(`${index + 1}. Email: ${result.email}, Status: ${result.status}, Message: ${result.message}`);
      });
    }
  }
}

testCurrentInvitation();

