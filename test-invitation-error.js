const axios = require('axios');

async function testInvitationError() {
  console.log('🔍 Testing invitation error...');
  
  try {
    // Test with the exact data from the frontend logs
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
    
    console.log('📤 Sending test invitation with data:', JSON.stringify(testData, null, 2));
    
    const response = await axios.post(
      'http://localhost:5001/api/invitations/ba7865ac-da20-404a-b609-804d15cb0467/send',
      testData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token' // This will fail auth, but let's see the validation errors
        }
      }
    );
    
    console.log('✅ Response:', response.data);
  } catch (error) {
    console.error('❌ Error response:', {
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

testInvitationError().catch(console.error);

