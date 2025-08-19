const axios = require('axios');

async function testMessageEndpoint() {
  const baseURL = process.env.API_URL || 'http://localhost:3001';
  const exchangeId = "d0ff9efc-c9c8-431e-83fa-e48661d10ef1";
  
  console.log('🧪 Testing message endpoint for exchange:', exchangeId);
  
  try {
    // First, let's try to get messages for the exchange
    console.log('\n📥 Testing GET /api/messages/exchange/:exchangeId...');
    
    const response = await axios.get(`${baseURL}/api/messages/exchange/${exchangeId}`, {
      headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN_HERE', // This would need to be a real token
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('📊 Messages found:', response.data?.data?.length || 0);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
    
    if (error.response?.status === 403) {
      console.log('🔒 Access denied - this is the issue we were trying to fix');
    }
  }
}

// Run the test
testMessageEndpoint().catch(console.error);
