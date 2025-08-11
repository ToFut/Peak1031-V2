const axios = require('axios');

async function testSingleTask() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNzgzMDRkZS01NjhmLTQxMzgtYjM1Yi02ZmRjZmJkMmYxY2UiLCJlbWFpbCI6ImFkbWluQHBlYWsxMDMxLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDYyNDk1MywiZXhwIjoxNzU0NzExMzUzfQ.AVdtn9NQXyS7t2gaQWBnPcWK-buAvc9QdHTxnDnGRUI';
  const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467'; // SEGEV DEMO exchange
  
  console.log('🧪 Testing single @TASK message...\n');
  
  try {
    const response = await axios.post('http://localhost:5001/api/messages', {
      exchangeId: exchangeId,
      content: '@TASK Review contract documents priority: high due: tomorrow'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response received:');
    console.log(JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSingleTask().catch(console.error);