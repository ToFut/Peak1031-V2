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
    
    // Test task creation with the exact data format from frontend
    console.log('🚀 Creating task...');
    const taskData = {
      title: 'Test Task',
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
    
    console.log('📝 Task data being sent:', JSON.stringify(taskData, null, 2));
    
    const taskResponse = await axios.post('http://localhost:5001/api/tasks', taskData, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Task created successfully:', taskResponse.data);
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testTaskCreation();