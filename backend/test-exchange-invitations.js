const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5001/api';

// Test user credentials
const testUser = {
  email: process.env.TEST_USER_EMAIL || 'admin@peak1031.com',
  password: process.env.TEST_USER_PASSWORD || 'admin123'
};

async function testExchangeInvitations() {
  try {
    console.log('🚀 Testing Exchange Invitations Display\n');
    
    // 1. Login
    console.log('1. Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, testUser);
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    console.log('✅ Logged in successfully');
    
    // 2. Use a specific exchange ID (from your console logs)
    const exchangeId = '8d1ea5f1-308a-48bd-b39a-6456d1b7c97f';
    console.log(`\n2. Using exchange ID: ${exchangeId}`);
    
    // 3. Send a test invitation using the complex endpoint
    console.log('\n3. Sending invitation via complex endpoint...');
    const invitationData = {
      invitations: [{
        email: `test_${Date.now()}@example.com`,
        role: 'client',
        method: 'email',
        firstName: 'Test',
        lastName: 'User'
      }],
      message: 'Test invitation message'
    };
    
    try {
      const sendResponse = await axios.post(
        `${API_URL}/invitations/${exchangeId}/send`, 
        invitationData, 
        { headers }
      );
      console.log('✅ Invitation sent:', JSON.stringify(sendResponse.data, null, 2));
    } catch (error) {
      console.log('❌ Error sending invitation:', error.response?.data || error.message);
    }
    
    // 4. Fetch invitations for the exchange
    console.log('\n4. Fetching invitations for exchange...');
    
    // Test the invitation-auth endpoint
    try {
      const invitationsResponse = await axios.get(
        `${API_URL}/invitation-auth/exchange/${exchangeId}/invitations`,
        { headers }
      );
      
      console.log(`✅ Found ${invitationsResponse.data.invitations?.length || 0} invitations`);
      
      if (invitationsResponse.data.invitations?.length > 0) {
        console.log('\nInvitations:');
        invitationsResponse.data.invitations.forEach((inv, index) => {
          console.log(`\n  ${index + 1}. Email: ${inv.email}`);
          console.log(`     Status: ${inv.status}`);
          console.log(`     Role: ${inv.role}`);
          console.log(`     Token: ${inv.token ? 'Present (' + inv.token.substring(0, 10) + '...)' : 'Missing'}`);
          console.log(`     Created: ${inv.created_at}`);
        });
      }
    } catch (error) {
      console.log('❌ Error fetching invitations:', error.response?.data || error.message);
    }
    
    // 5. Also check what's in the database directly
    console.log('\n5. Checking database invitations for exchange...');
    try {
      const dbResponse = await axios.get(
        `${API_URL}/invitations/sent/${exchangeId}`,
        { headers }
      );
      
      console.log(`✅ Database has ${dbResponse.data.invitations?.length || 0} invitations for this exchange`);
      
      if (dbResponse.data.invitations?.length > 0) {
        console.log('\nDatabase invitations:');
        dbResponse.data.invitations.forEach((inv, index) => {
          console.log(`\n  ${index + 1}. Email: ${inv.email}`);
          console.log(`     Status: ${inv.status}`);
          console.log(`     Token: ${inv.invitation_token ? 'Present (' + inv.invitation_token.substring(0, 10) + '...)' : 'Missing'}`);
        });
      }
    } catch (error) {
      console.log('❌ Error:', error.response?.data || error.message);
    }
    
    console.log('\n✅ Test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testExchangeInvitations();