const axios = require('axios');

async function testAgenciesWithAuth() {
  try {
    console.log('🧪 Testing agencies endpoint with authentication...');
    
    // First, login as admin to get a token
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Test the agencies endpoint with the token
    console.log('📡 Testing /api/agencies endpoint...');
    const agenciesResponse = await axios.get('http://localhost:5001/api/agencies?page=1&limit=20&includeStats=true', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Agencies endpoint response:');
    console.log('Status:', agenciesResponse.status);
    console.log('Data:', JSON.stringify(agenciesResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Test failed:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testAgenciesWithAuth();




