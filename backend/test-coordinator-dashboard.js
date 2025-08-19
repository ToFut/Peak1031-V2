const axios = require('axios');

async function testCoordinatorDashboard() {
  try {
    console.log('🧪 Testing coordinator dashboard endpoint...');
    
    // First, let's test the health endpoint
    const healthResponse = await axios.get('http://localhost:5001/api/health');
    console.log('✅ Health check passed:', healthResponse.data);
    
    // Now let's test the coordinator dashboard endpoint
    // We need a valid token, so let's try to get one
    const response = await axios.get('http://localhost:5001/api/admin/coordinator-dashboard', {
      headers: {
        'Authorization': 'Bearer test-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Coordinator dashboard response:', response.data);
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('🔐 Authentication failed - this is expected with test token');
    }
  }
}

testCoordinatorDashboard();
