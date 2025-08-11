const axios = require('axios');

async function testTaskSimple() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNzgzMDRkZS01NjhmLTQxMzgtYjM1Yi02ZmRjZmJkMmYxY2UiLCJlbWFpbCI6ImFkbWluQHBlYWsxMDMxLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDYyNDk1MywiZXhwIjoxNzU0NzExMzUzfQ.AVdtn9NQXyS7t2gaQWBnPcWK-buAvc9QdHTxnDnGRUI';
  
  console.log('🧪 Testing @TASK functionality...\n');
  
  try {
    console.log('Sending request to create message with @TASK...');
    const response = await axios.post('http://localhost:5001/api/messages', {
      exchangeId: 'ba7865ac-da20-404a-b609-804d15cb0467',
      content: '@TASK Test task creation priority: medium due: today'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('\n✅ Success! Message created:');
    console.log('   Message ID:', response.data.data.id);
    console.log('   Content:', response.data.data.content);
    
    if (response.data.data.taskCreated) {
      console.log('\n🎉 Task auto-created!');
      console.log('   Task ID:', response.data.data.taskCreated.id);
      console.log('   Title:', response.data.data.taskCreated.title);
      console.log('   Priority:', response.data.data.taskCreated.priority);
      console.log('   Due Date:', response.data.data.taskCreated.due_date);
    } else {
      console.log('\n❌ No task was created');
    }
    
  } catch (error) {
    console.error('\n❌ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Message:', error.message);
    }
  }
}

testTaskSimple();