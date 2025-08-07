const axios = require('axios');

async function testFixedOAuth() {
  try {
    // Login as admin
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@test.com', 
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Admin login successful');
    
    // Test the fixed endpoint that frontend now uses
    const response = await axios.get('http://localhost:5001/api/admin/pp-token/auth-url', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ OAuth endpoint working!');
    console.log('Response structure:');
    console.log('  success:', response.data.success);
    console.log('  has auth_url:', !!response.data.auth_url);
    console.log('  has instructions:', !!response.data.instructions);
    
    if (response.data.auth_url) {
      console.log('  auth_url length:', response.data.auth_url.length, 'characters');
      console.log('🎉 Frontend OAuth should now work!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testFixedOAuth();