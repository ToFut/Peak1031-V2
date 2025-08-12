const axios = require('axios');

async function testAdminDemoSegev() {
  const baseURL = 'http://localhost:5001/api';
  
  try {
    // 1. Login as admin
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // 2. Get all exchanges and find "Demo Segev"
    console.log('\n📋 Looking for "Demo Segev" exchange...');
    const exchangesResponse = await axios.get(`${baseURL}/exchanges`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const exchanges = exchangesResponse.data.exchanges || [];
    const demoSegev = exchanges.find(ex => 
      ex.name && ex.name.toLowerCase().includes('demo segev')
    );
    
    if (!demoSegev) {
      console.log('❌ "Demo Segev" exchange not found');
      console.log('Available exchanges:', exchanges.slice(0, 5).map(e => e.name));
      return;
    }
    
    console.log('✅ Found "Demo Segev" exchange:', {
      id: demoSegev.id,
      name: demoSegev.name,
      status: demoSegev.status
    });
    
    // 3. Get messages for this exchange
    console.log('\n💬 Fetching messages for "Demo Segev"...');
    const messagesResponse = await axios.get(`${baseURL}/messages/exchange/${demoSegev.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const messages = messagesResponse.data.data || [];
    console.log(`✅ Found ${messages.length} messages`);
    
    if (messages.length > 0) {
      console.log('\nFirst 3 messages:');
      messages.slice(0, 3).forEach((msg, index) => {
        console.log(`\n${index + 1}. Message ID: ${msg.id}`);
        console.log(`   Content: ${msg.content.substring(0, 100)}...`);
        console.log(`   Sender: ${msg.sender?.email || 'Unknown'}`);
        console.log(`   Created: ${new Date(msg.created_at).toLocaleString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAdminDemoSegev();