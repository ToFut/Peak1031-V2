const axios = require('axios');

async function testFrontendAgenciesCall() {
  try {
    console.log('🧪 Testing frontend agencies API call...');
    
    // First, login as admin to get a token (simulating frontend login)
    console.log('🔐 Logging in as admin...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');
    
    // Now test the agencies endpoint directly on backend
    console.log('📡 Testing /api/agencies directly on backend...');
    const agenciesResponse = await axios.get('http://localhost:5001/api/agencies?page=1&limit=20&includeStats=true', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Frontend agencies endpoint response:');
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

testFrontendAgenciesCall();