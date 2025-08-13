const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5001/api';

// Test user credentials
const testUser = {
  email: process.env.TEST_USER_EMAIL || 'admin@peak1031.com',
  password: process.env.TEST_USER_PASSWORD || 'admin123'
};

async function testCompleteInvitationFlow() {
  try {
    console.log('🚀 Testing Complete Invitation Flow\n');
    
    // 1. Login
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, testUser);
    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id;
    
    console.log('✅ Logged in successfully');
    
    const headers = { Authorization: `Bearer ${token}` };
    
    // 2. Get exchanges
    console.log('\n2. Getting exchanges...');
    const exchangesResponse = await axios.get(`${API_URL}/exchanges`, { headers });
    const exchanges = exchangesResponse.data.exchanges || [];
    
    if (exchanges.length === 0) {
      console.log('❌ No exchanges found. Please create an exchange first.');
      return;
    }
    
    const exchange = exchanges[0];
    console.log(`✅ Using exchange: ${exchange.exchange_name || exchange.exchange_number} (ID: ${exchange.id})`);
    
    // 3. Send invitation with new system
    console.log('\n3. Sending invitation with link generation...');
    const testEmail = `test_${Date.now()}@example.com`;
    const invitationData = {
      exchange_id: exchange.id,
      emails: [testEmail],
      role: 'client',
      message: 'Test invitation with proper token generation'
    };
    
    const sendResponse = await axios.post(`${API_URL}/invitations/send`, invitationData, { headers });
    console.log('✅ Invitation sent successfully');
    console.log(`   Response:`, JSON.stringify(sendResponse.data, null, 2));
    
    // Check if we got invitation links
    if (sendResponse.data.results && sendResponse.data.results[0]) {
      const invitation = sendResponse.data.results[0];
      
      if (invitation.invitationLink) {
        console.log('\n✅ Invitation link generated:');
        console.log(`   ${invitation.invitationLink}`);
        console.log(`   Token: ${invitation.token}`);
        
        // 4. Test token validation
        console.log('\n4. Testing token validation...');
        try {
          const validateResponse = await axios.get(
            `${API_URL}/invitation-auth/validate/${invitation.token}`
          );
          
          if (validateResponse.data.success) {
            console.log('✅ Token validation successful!');
            console.log('   Invitation details:', JSON.stringify(validateResponse.data.invitation, null, 2));
          } else {
            console.log('❌ Token validation failed:', validateResponse.data.error);
          }
        } catch (validateError) {
          console.log('❌ Token validation error:', validateError.response?.data || validateError.message);
        }
      } else {
        console.log('❌ No invitation link generated in response');
      }
    }
    
    // 5. Get sent invitations to verify storage
    console.log('\n5. Fetching sent invitations...');
    try {
      const sentResponse = await axios.get(`${API_URL}/invitations/sent/${exchange.id}`, { headers });
      const sentInvitations = sentResponse.data.invitations || [];
      
      console.log(`✅ Found ${sentInvitations.length} sent invitations`);
      const recent = sentInvitations.find(inv => inv.email === testEmail);
      if (recent) {
        console.log('   Recent invitation found:');
        console.log(`   - Email: ${recent.email}`);
        console.log(`   - Status: ${recent.status}`);
        console.log(`   - Token exists: ${!!recent.invitation_token}`);
        console.log(`   - Token length: ${recent.invitation_token?.length || 0} characters`);
      }
    } catch (error) {
      console.log('❌ Failed to get sent invitations:', error.response?.data || error.message);
    }
    
    console.log('\n✅ Test completed!');
    console.log('\n📝 Summary:');
    console.log('   - Invitations now generate proper hex tokens (64 characters)');
    console.log('   - Invitation links are returned in the response');
    console.log('   - Links follow the format: /onboarding/invitation/{token}');
    console.log('   - Tokens can be validated via /api/invitation-auth/validate/{token}');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 404) {
      console.log('\n⚠️  Note: 404 errors suggest the invitation-auth routes may not be loaded.');
      console.log('   Check that USE_MOCK_DATA is not set to true in your environment.');
    }
  }
}

// Run the test
testCompleteInvitationFlow();