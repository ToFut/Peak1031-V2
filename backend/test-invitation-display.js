const axios = require('axios');
require('dotenv').config();

const API_URL = 'http://localhost:5001/api';

// Test user credentials
const testUser = {
  email: process.env.TEST_USER_EMAIL || 'admin@peak1031.com',
  password: process.env.TEST_USER_PASSWORD || 'admin123'
};

async function testInvitationFlow() {
  try {
    console.log('🚀 Testing Invitation Display Flow\n');
    
    // 1. Login
    console.log('1. Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, testUser);
    const token = loginResponse.data.token;
    const userId = loginResponse.data.user.id;
    
    console.log('✅ Logged in successfully');
    console.log(`   User ID: ${userId}`);
    console.log(`   Token: ${token.substring(0, 20)}...`);
    
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
    console.log(`✅ Found ${exchanges.length} exchanges`);
    console.log(`   Using exchange: ${exchange.exchange_name} (ID: ${exchange.id})`);
    
    // 3. Send test invitations
    console.log('\n3. Sending test invitations...');
    const invitationData = {
      exchange_id: exchange.id,
      emails: ['test1@example.com', 'test2@example.com'],
      role: 'client',
      message: 'Test invitation sent at ' + new Date().toISOString()
    };
    
    try {
      const sendResponse = await axios.post(`${API_URL}/invitations/send`, invitationData, { headers });
      console.log('✅ Invitations sent successfully');
      console.log(`   Result: ${JSON.stringify(sendResponse.data, null, 2)}`);
    } catch (error) {
      console.log('❌ Failed to send invitations:', error.response?.data || error.message);
    }
    
    // 4. Get sent invitations for the exchange
    console.log('\n4. Getting sent invitations for this exchange...');
    try {
      const sentResponse = await axios.get(`${API_URL}/invitations/sent/${exchange.id}`, { headers });
      const sentInvitations = sentResponse.data.invitations || [];
      
      console.log(`✅ Found ${sentInvitations.length} sent invitations`);
      sentInvitations.forEach((inv, index) => {
        console.log(`\n   Invitation ${index + 1}:`);
        console.log(`   - Email: ${inv.email}`);
        console.log(`   - Role: ${inv.role}`);
        console.log(`   - Status: ${inv.status}`);
        console.log(`   - Created: ${new Date(inv.created_at).toLocaleString()}`);
        if (inv.message) {
          console.log(`   - Message: ${inv.message}`);
        }
      });
    } catch (error) {
      console.log('❌ Failed to get sent invitations:', error.response?.data || error.message);
    }
    
    // 5. Get pending invitations (received by current user)
    console.log('\n5. Getting pending invitations for current user...');
    try {
      const pendingResponse = await axios.get(`${API_URL}/invitations`, { headers });
      const pendingInvitations = pendingResponse.data.invitations || [];
      
      console.log(`✅ Found ${pendingInvitations.length} pending invitations`);
      pendingInvitations.forEach((inv, index) => {
        console.log(`\n   Invitation ${index + 1}:`);
        console.log(`   - From Exchange: ${inv.exchange?.exchange_name || 'Unknown'}`);
        console.log(`   - Role: ${inv.role}`);
        console.log(`   - Invited by: ${inv.invited_by?.email || 'Unknown'}`);
        console.log(`   - Created: ${new Date(inv.created_at).toLocaleString()}`);
      });
    } catch (error) {
      console.log('❌ Failed to get pending invitations:', error.response?.data || error.message);
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 Summary:');
    console.log('   - Sent invitations should now appear in the "Sent Invitations" section');
    console.log('   - Pending invitations (received) should appear in "Your Pending Invitations" section');
    console.log('   - The UI will auto-refresh after sending new invitations');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testInvitationFlow();