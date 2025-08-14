const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5001/api';

// Test user credentials
const testUser = {
  email: process.env.TEST_USER_EMAIL || 'admin@peak1031.com',
  password: process.env.TEST_USER_PASSWORD || 'admin123'
};

async function testInvitationFetch() {
  try {
    console.log('🚀 Testing Invitation Fetch\n');
    
    // 1. Login
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, testUser);
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Logged in successfully');
    
    // 2. Get exchanges
    console.log('\n2. Getting exchanges...');
    const exchangesResponse = await axios.get(`${API_URL}/exchanges`, { headers });
    const exchanges = exchangesResponse.data.exchanges || [];
    
    if (exchanges.length === 0) {
      console.log('❌ No exchanges found.');
      return;
    }
    
    const exchange = exchanges[0];
    console.log(`✅ Using exchange: ${exchange.exchange_name || exchange.exchange_number} (ID: ${exchange.id})`);
    
    // 3. Test different invitation fetch endpoints
    console.log('\n3. Testing invitation endpoints...');
    
    // Test /api/invitations/sent/:exchangeId
    console.log('\n   a) Testing /api/invitations/sent/:exchangeId');
    try {
      const sentResponse = await axios.get(`${API_URL}/invitations/sent/${exchange.id}`, { headers });
      console.log(`   ✅ Found ${sentResponse.data.invitations?.length || 0} sent invitations`);
      if (sentResponse.data.invitations?.length > 0) {
        console.log('   Sample invitation:', JSON.stringify(sentResponse.data.invitations[0], null, 2));
      }
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data || error.message);
    }
    
    // Test /api/invitation-auth/exchange/:exchangeId/invitations
    console.log('\n   b) Testing /api/invitation-auth/exchange/:exchangeId/invitations');
    try {
      const authInvitationsResponse = await axios.get(
        `${API_URL}/invitation-auth/exchange/${exchange.id}/invitations`, 
        { headers }
      );
      console.log(`   ✅ Found ${authInvitationsResponse.data.invitations?.length || 0} invitations`);
      if (authInvitationsResponse.data.invitations?.length > 0) {
        console.log('   Sample invitation:', JSON.stringify(authInvitationsResponse.data.invitations[0], null, 2));
      }
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data || error.message);
    }
    
    // Test /api/invitations (pending for current user)
    console.log('\n   c) Testing /api/invitations (pending for current user)');
    try {
      const pendingResponse = await axios.get(`${API_URL}/invitations`, { headers });
      console.log(`   ✅ Found ${pendingResponse.data.invitations?.length || 0} pending invitations for current user`);
      if (pendingResponse.data.invitations?.length > 0) {
        console.log('   Sample invitation:', JSON.stringify(pendingResponse.data.invitations[0], null, 2));
      }
    } catch (error) {
      console.log('   ❌ Error:', error.response?.data || error.message);
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testInvitationFetch();