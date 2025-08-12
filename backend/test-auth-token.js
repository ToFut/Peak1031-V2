// Test if auth token works
const axios = require('axios');

async function testAuthToken() {
  try {
    // First login to get a token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Login successful');
    console.log('👤 User:', user);
    console.log('🔑 Token (first 20 chars):', token.substring(0, 20) + '...');
    
    // Test if token works for a simple endpoint
    console.log('\n🧪 Testing token with profile endpoint...');
    try {
      const profileResponse = await axios.get('http://localhost:5001/api/auth/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ Profile endpoint works:', profileResponse.data);
    } catch (error) {
      console.error('❌ Profile endpoint failed:', error.response?.data || error.message);
    }
    
    // Test creating a simple task
    console.log('\n🧪 Testing task creation with minimal data...');
    
    // Get first exchange
    const exchangesResponse = await axios.get('http://localhost:5001/api/exchanges', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const firstExchange = exchangesResponse.data.exchanges[0];
    
    const minimalTask = {
      title: 'Test Minimal Task',
      exchange_id: firstExchange.id
    };
    
    console.log('📝 Minimal task data:', minimalTask);
    
    try {
      const taskResponse = await axios.post('http://localhost:5001/api/tasks', minimalTask, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('✅ Minimal task created successfully');
      console.log('📋 Created task:', taskResponse.data);
    } catch (error) {
      console.error('❌ Task creation failed:', error.response?.data || error.message);
      if (error.response?.data) {
        console.error('📋 Full error response:', JSON.stringify(error.response.data, null, 2));
      }
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

testAuthToken();