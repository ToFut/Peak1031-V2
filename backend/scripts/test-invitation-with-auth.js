const axios = require('axios');

async function testInvitationWithAuth() {
  try {
    console.log('🧪 Testing SMS invitation with authentication...');

    // Step 1: Login to get a valid token
    console.log('🔑 Logging in to get authentication token...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'Peak1031!'
    });

    if (loginResponse.status !== 200) {
      throw new Error('Login failed');
    }

    const token = loginResponse.data.accessToken;
    console.log('✅ Successfully authenticated');

    // Step 2: Send SMS invitation
    console.log('📱 Sending SMS invitation...');
    const invitationData = {
      email: 'testuser@example.com',
      phone: '+12137086881', // User's verified phone number
      method: 'sms',
      exchangeId: 1,
      role: 'client',
      firstName: 'Test',
      lastName: 'User',
      customMessage: 'Testing Twilio Verify Service integration for SMS invitations'
    };

    const inviteResponse = await axios.post('http://localhost:5001/api/invitations/1/send', invitationData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('📧 Invitation Response Status:', inviteResponse.status);
    console.log('📧 Invitation Response Data:', JSON.stringify(inviteResponse.data, null, 2));

    if (inviteResponse.status === 200 || inviteResponse.status === 201) {
      console.log('✅ SMS invitation sent successfully via Twilio Verify Service');
      
      // Check if SMS was actually sent
      if (inviteResponse.data.results?.sms?.sent) {
        console.log('📱 ✅ SMS was sent successfully');
      } else {
        console.log('📱 ❌ SMS was not sent:', inviteResponse.data.results?.sms?.error);
      }
    } else {
      console.log('❌ Invitation request failed');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testInvitationWithAuth();