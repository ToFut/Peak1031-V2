const axios = require('axios');

async function testAgentCommands() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNzgzMDRkZS01NjhmLTQxMzgtYjM1Yi02ZmRjZmJkMmYxY2UiLCJlbWFpbCI6ImFkbWluQHBlYWsxMDMxLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDYyNDk1MywiZXhwIjoxNzU0NzExMzUzfQ.AVdtn9NQXyS7t2gaQWBnPcWK-buAvc9QdHTxnDnGRUI';
  
  console.log('🧪 Testing @TASK and @ADD functionality...\n');
  
  try {
    // Test @TASK command
    console.log('1. Testing @TASK command...');
    const taskResponse = await axios.post('http://localhost:5001/api/messages', {
      exchangeId: 'ba7865ac-da20-404a-b609-804d15cb0467',
      content: '@TASK Review contract documents priority: high due: tomorrow #urgent'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ @TASK message created successfully!');
    console.log('   Message ID:', taskResponse.data.data.id);
    console.log('   Agent Results:', JSON.stringify(taskResponse.data.data.agentResults, null, 2));
    
    // Test @ADD command
    console.log('\n2. Testing @ADD command...');
    const addResponse = await axios.post('http://localhost:5001/api/messages', {
      exchangeId: 'ba7865ac-da20-404a-b609-804d15cb0467',
      content: '@ADD mobile: +1-555-123-4567 name: John Smith company: ABC Corp'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ @ADD message created successfully!');
    console.log('   Message ID:', addResponse.data.data.id);
    console.log('   Agent Results:', JSON.stringify(addResponse.data.data.agentResults, null, 2));
    
    // Test both commands in one message
    console.log('\n3. Testing both @TASK and @ADD in one message...');
    const bothResponse = await axios.post('http://localhost:5001/api/messages', {
      exchangeId: 'ba7865ac-da20-404a-b609-804d15cb0467',
      content: 'Need to call the client @TASK Follow up with client call priority: medium due: today and @ADD mobile: +1-555-987-6543 name: Jane Doe'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Combined message created successfully!');
    console.log('   Message ID:', bothResponse.data.data.id);
    console.log('   Agent Results:', JSON.stringify(bothResponse.data.data.agentResults, null, 2));
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
  }
}

testAgentCommands();