const axios = require('axios');

async function testAdminMessage() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNzgzMDRkZS01NjhmLTQxMzgtYjM1Yi02ZmRjZmJkMmYxY2UiLCJlbWFpbCI6ImFkbWluQHBlYWsxMDMxLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDYyNDk1MywiZXhwIjoxNzU0NzExMzUzfQ.AVdtn9NQXyS7t2gaQWBnPcWK-buAvc9QdHTxnDnGRUI';
  
  try {
    console.log('🧪 Testing admin message sending...');
    
    const response = await axios.post('http://localhost:5001/api/messages', {
      exchangeId: 'ba7865ac-da20-404a-b609-804d15cb0467',
      content: 'Admin test message - permissions working!'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Message sent successfully!');
    console.log('Response:', response.data);
    
  } catch (error) {
    console.error('❌ Error sending message:', error.response?.data || error.message);
  }
}

testAdminMessage();