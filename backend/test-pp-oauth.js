const axios = require('axios');

async function testAdminPPRoutes() {
  try {
    // Login as admin
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@test.com', 
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Logged in as admin');
    
    // Test admin PP auth URL endpoint (which we know works)
    console.log('🔍 Testing /api/admin/pp-token/auth-url...');
    const authUrlResponse = await axios.get('http://localhost:5001/api/admin/pp-token/auth-url', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    
    console.log('✅ Admin PP auth-url working!');
    console.log('Auth URL available:', !!authUrlResponse.data.auth_url);
    console.log('Response structure:', {
      success: authUrlResponse.data.success,
      hasAuthUrl: !!authUrlResponse.data.auth_url,
      hasInstructions: !!authUrlResponse.data.instructions
    });
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testAdminPPRoutes();