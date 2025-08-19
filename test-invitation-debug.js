const axios = require('axios');

async function testInvitationDebug() {
  console.log('🔍 Testing invitation debug...');
  
  try {
    // First, let's test the invitation details endpoint to see if it works
    console.log('\n1️⃣ Testing invitation details endpoint...');
    const detailsResponse = await axios.get('http://localhost:5001/api/invitations/details/be24c1c62f3e6e144f85ba604904c65965566bf98567139e51a1f033bcb78e83');
    console.log('✅ Invitation details response:', detailsResponse.data);
    
    // Now let's test the invitation sending with proper authentication
    console.log('\n2️⃣ Testing invitation sending...');
    
    // Get a valid token by logging in
    console.log('🔐 Logging in to get valid token...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Got token:', token ? 'Valid token received' : 'No token');
    
    if (!token) {
      console.log('❌ No token received from login');
      return;
    }
    
    // Test invitation sending with valid token
    const testData = {
      invitations: [{
        email: "segevni@icloud.com",
        phone: "2137086881",
        role: "client",
        method: "email",
        firstName: "",
        lastName: ""
      }],
      message: ""
    };
    
    console.log('📤 Sending invitation with valid token...');
    const invitationResponse = await axios.post(
      'http://localhost:5001/api/invitations/ba7865ac-da20-404a-b609-804d15cb0467/send',
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('✅ Invitation response:', invitationResponse.data);
    
    // Check if there are any errors in the results
    if (invitationResponse.data.results) {
      invitationResponse.data.results.forEach((result, index) => {
        console.log(`📋 Result ${index + 1}:`, {
          email: result.email,
          status: result.status,
          message: result.message,
          error: result.error
        });
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
    
    if (error.response?.data?.errors) {
      console.log('🔍 Validation errors:');
      error.response.data.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. ${err.msg} (${err.param})`);
      });
    }
  }
}

testInvitationDebug().catch(console.error);

