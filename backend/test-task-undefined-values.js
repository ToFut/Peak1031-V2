// Test task creation with undefined values to debug the frontend issue
const axios = require('axios');

async function testTaskWithUndefinedValues() {
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
    const firstExchange = exchanges[0];
    
    // Test with undefined/null values that might cause JSON.stringify issues
    console.log('\n🧪 Testing undefined/null values');
    try {
      const taskWithUndefined = {
        title: 'Test Task With Undefined',
        description: 'Test description',
        priority: 'medium',
        category: 'general',
        assignedTo: '',
        dueDate: '',
        estimatedDuration: '',
        exchange_id: firstExchange.id,
        exchangeId: firstExchange.id,
        assigned_to: undefined, // This could cause issues
        due_date: undefined,    // This could cause issues
        metadata: undefined     // This could cause issues
      };
      
      console.log('📝 Task with undefined values:', JSON.stringify(taskWithUndefined, null, 2));
      
      const response = await axios.post('http://localhost:5001/api/tasks', taskWithUndefined, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Task with undefined values created successfully');
    } catch (error) {
      console.error('❌ Task with undefined values failed:', error.response?.data || error.message);
      if (error.response?.data) {
        console.error('📋 Error details:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
    // Test with empty string title (this should fail)
    console.log('\n🧪 Testing empty string title');
    try {
      const taskWithEmptyTitle = {
        title: '',  // Empty string
        description: 'Test description',
        exchange_id: firstExchange.id
      };
      
      const response = await axios.post('http://localhost:5001/api/tasks', taskWithEmptyTitle, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('❌ Empty title should have failed');
    } catch (error) {
      console.log('✅ Empty title correctly failed:', error.response?.data?.details);
    }
    
    // Test with whitespace-only title (this should fail)
    console.log('\n🧪 Testing whitespace-only title');
    try {
      const taskWithWhitespaceTitle = {
        title: '   ',  // Just whitespace
        description: 'Test description',
        exchange_id: firstExchange.id
      };
      
      const response = await axios.post('http://localhost:5001/api/tasks', taskWithWhitespaceTitle, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('❌ Whitespace title should have failed');
    } catch (error) {
      console.log('✅ Whitespace title correctly failed:', error.response?.data?.details);
    }
    
  } catch (error) {
    console.error('❌ Test setup error:', error.response?.data || error.message);
  }
}

testTaskWithUndefinedValues();