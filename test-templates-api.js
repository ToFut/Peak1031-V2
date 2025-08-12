const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

async function testTemplatesAPI() {
  try {
    console.log('🔍 Testing templates API...');
    
    // Test the templates endpoint
    console.log('📋 Testing GET /api/templates...');
    const response = await axios.get(`${API_BASE}/templates`, {
      headers: {
        'Authorization': 'Bearer test-token' // This will fail auth but we can see if the endpoint exists
      }
    });
    
    console.log('✅ Templates API response:', response.data);
  } catch (error) {
    if (error.response) {
      console.log('📊 API Response Status:', error.response.status);
      console.log('📊 API Response Data:', error.response.data);
      
      if (error.response.status === 401) {
        console.log('🔐 Authentication required - this is expected');
      }
    } else if (error.code === 'ECONNREFUSED') {
      console.log('❌ Connection refused - backend server is not running');
      console.log('💡 Please start the backend server with: npm run dev (in backend directory)');
    } else {
      console.log('❌ Error:', error.message);
    }
  }
}

testTemplatesAPI();



