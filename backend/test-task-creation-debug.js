// Test task creation to debug the 400 error
const axios = require('axios');

async function testTaskCreation() {
  try {
    // First login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Get exchanges to use a real exchange ID
    console.log('📋 Getting exchanges...');
    const exchangesResponse = await axios.get('http://localhost:5001/api/exchanges', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const exchanges = exchangesResponse.data.exchanges || [];
    if (exchanges.length === 0) {
      console.error('❌ No exchanges found');
      return;
    }
    
    const firstExchange = exchanges[0];
    console.log('🏢 Using exchange:', {
      id: firstExchange.id,
      name: firstExchange.name
    });
    
    // Test 1: Simple valid task
    console.log('\n🧪 Test 1: Simple valid task');
    try {
      const simpleTask = {
        title: 'Test Task Simple',
        description: 'Test description',
        exchange_id: firstExchange.id
      };
      
      console.log('📝 Simple task data:', JSON.stringify(simpleTask, null, 2));
      
      const response = await axios.post('http://localhost:5001/api/tasks', simpleTask, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Simple task created successfully');
    } catch (error) {
      console.error('❌ Simple task failed:', error.response?.data || error.message);
    }
    
    // Test 2: Frontend-style task data
    console.log('\n🧪 Test 2: Frontend-style task data');
    try {
      const frontendTask = {
        title: 'Test Task Frontend Style',
        description: 'Test task description',
        priority: 'medium',
        category: 'general',
        assignedTo: '',
        dueDate: '',
        estimatedDuration: '',
        exchange_id: firstExchange.id,
        exchangeId: firstExchange.id,
        assigned_to: undefined,
        due_date: undefined,
        metadata: undefined
      };
      
      console.log('📝 Frontend-style task data:', JSON.stringify(frontendTask, null, 2));
      
      const response = await axios.post('http://localhost:5001/api/tasks', frontendTask, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Frontend-style task created successfully');
    } catch (error) {
      console.error('❌ Frontend-style task failed:', error.response?.data || error.message);
      if (error.response?.data) {
        console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Test 3: Test with empty title (should fail)
    console.log('\n🧪 Test 3: Empty title (should fail)');
    try {
      const emptyTitleTask = {
        title: '',
        description: 'Test description',
        exchange_id: firstExchange.id
      };
      
      const response = await axios.post('http://localhost:5001/api/tasks', emptyTitleTask, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('❌ Empty title task should have failed but succeeded');
    } catch (error) {
      console.log('✅ Empty title correctly failed:', error.response?.data?.details);
    }
    
    // Test 4: Test with no exchange ID (should fail)
    console.log('\n🧪 Test 4: No exchange ID (should fail)');
    try {
      const noExchangeTask = {
        title: 'Test Task No Exchange',
        description: 'Test description'
      };
      
      const response = await axios.post('http://localhost:5001/api/tasks', noExchangeTask, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('❌ No exchange task should have failed but succeeded');
    } catch (error) {
      console.log('✅ No exchange correctly failed:', error.response?.data?.details);
    }
    
  } catch (error) {
    console.error('❌ Test setup error:', error.response?.data || error.message);
  }
}

testTaskCreation();