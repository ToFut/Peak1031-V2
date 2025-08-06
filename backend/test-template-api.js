const axios = require('axios');
require('dotenv').config();

async function testTemplateAPI() {
  try {
    // First, we need to get a valid token
    console.log('🔐 Getting auth token...');
    
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'TempPass123!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Got token');
    
    // Test GET templates
    console.log('\n📋 Testing GET /api/documents/templates...');
    try {
      const templatesResponse = await axios.get('http://localhost:5001/api/documents/templates', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('✅ Templates fetched successfully:', templatesResponse.data);
    } catch (error) {
      console.error('❌ Error fetching templates:', error.response?.data || error.message);
      console.error('Status:', error.response?.status);
      console.error('Headers:', error.response?.headers);
    }
    
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
  }
}

testTemplateAPI();