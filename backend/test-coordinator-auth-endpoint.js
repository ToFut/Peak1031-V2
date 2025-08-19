require('dotenv').config();
const axios = require('axios');

async function testCoordinatorAuthEndpoint() {
  console.log('🔍 Testing coordinator login endpoint...');
  
  try {
    const loginData = {
      email: 'coordinator@peak1031.com',
      password: 'coordinator123'
    };
    
    console.log('📧 Login data:', loginData);
    
    const response = await axios.post('http://localhost:5000/api/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Login successful!');
    console.log('🔑 Response:', {
      status: response.status,
      hasToken: !!response.data.token,
      hasUser: !!response.data.user,
      userEmail: response.data.user?.email,
      userRole: response.data.user?.role
    });
    
  } catch (error) {
    console.log('❌ Login failed');
    if (error.response) {
      console.log('📊 Error response:', {
        status: error.response.status,
        data: error.response.data
      });
    } else {
      console.log('❌ Network error:', error.message);
    }
  }
}

testCoordinatorAuthEndpoint();
