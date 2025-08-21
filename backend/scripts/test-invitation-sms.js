const axios = require('axios');

async function testInvitationSMS() {
  try {
    console.log('🧪 Testing SMS invitation with Twilio Verify Service...');

    const invitationData = {
      email: 'test@example.com',
      phone: '+12137086881', // User's verified phone number
      method: 'sms',
      exchangeId: 1,
      role: 'client',
      firstName: 'Test',
      lastName: 'User',
      customMessage: 'Testing Twilio Verify Service integration'
    };

    const response = await axios.post('http://localhost:5001/api/invitations/1/send', invitationData, {
      headers: {
        'Content-Type': 'application/json',
        // Note: In production, you would need a valid JWT token
        'Authorization': 'Bearer test-token'
      },
      validateStatus: () => true // Accept any status code
    });

    console.log('📧 Response Status:', response.status);
    console.log('📧 Response Data:', JSON.stringify(response.data, null, 2));

    if (response.status === 200 || response.status === 201) {
      console.log('✅ Invitation request completed');
    } else {
      console.log('❌ Invitation request failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testInvitationSMS();