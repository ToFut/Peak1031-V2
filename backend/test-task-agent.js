const axios = require('axios');

async function testTaskAgent() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNzgzMDRkZS01NjhmLTQxMzgtYjM1Yi02ZmRjZmJkMmYxY2UiLCJlbWFpbCI6ImFkbWluQHBlYWsxMDMxLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDYyNDk1MywiZXhwIjoxNzU0NzExMzUzfQ.AVdtn9NQXyS7t2gaQWBnPcWK-buAvc9QdHTxnDnGRUI';
  const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467'; // SEGEV DEMO exchange
  
  const testMessages = [
    {
      name: 'Simple Task',
      message: 'Hey everyone, @TASK Review contract documents for accuracy priority: high due: tomorrow'
    },
    {
      name: 'Task with Assignment',
      message: '@TASK Call client about property inspection assign: @john due: Friday'
    },
    {
      name: 'Task with Tags',
      message: '@TASK Update exchange timeline due: 2025-08-15 #urgent #client-communication'
    },
    {
      name: 'Complex Task',
      message: 'Hi team, @TASK Prepare closing documents priority: medium due: next week. Make sure to include all necessary forms and get signatures.'
    },
    {
      name: 'Regular Message',
      message: 'This is just a normal message without any task.'
    }
  ];
  
  console.log('🧪 Testing @TASK agent functionality...\n');
  
  for (let i = 0; i < testMessages.length; i++) {
    const test = testMessages[i];
    console.log(`\n--- Test ${i + 1}: ${test.name} ---`);
    console.log(`Message: "${test.message}"`);
    
    try {
      const response = await axios.post('http://localhost:5001/api/messages', {
        exchangeId: exchangeId,
        content: test.message
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Message sent successfully');
      
      if (response.data.data.taskCreated) {
        console.log('🤖 Task automatically created:');
        console.log(`   ID: ${response.data.data.taskCreated.id}`);
        console.log(`   Title: ${response.data.data.taskCreated.title}`);
        console.log(`   Priority: ${response.data.data.taskCreated.priority}`);
        console.log(`   Due Date: ${response.data.data.taskCreated.due_date || 'None'}`);
      } else {
        console.log('📝 No task created (as expected)');
      }
      
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.error || error.message);
    }
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n🏁 @TASK agent testing complete!');
}

testTaskAgent().catch(console.error);