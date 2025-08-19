const axios = require('axios');
const supabaseService = require('../services/supabase');

async function testMessageEndpointWithAuth() {
  const exchangeId = "d0ff9efc-c9c8-431e-83fa-e48661d10ef1";
  const userEmail = "client@peak1031.com";
  
  console.log('🧪 Testing message endpoint with authentication for:', { exchangeId, userEmail });
  
  try {
    // 1. Get the user from database
    const { data: user, error: userError } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();
      
    if (userError) {
      console.log('❌ User not found:', userError);
      return;
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      contact_id: user.contact_id
    });
    
    // 2. Test the messaging endpoint
    console.log('\n📥 Testing GET /api/messages/exchange/:exchangeId...');
    
    const response = await axios.get(`http://localhost:5001/api/messages/exchange/${exchangeId}`, {
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real scenario, you would need a valid JWT token here
        // For now, we'll test without auth to see if the endpoint works
      }
    });
    
    console.log('✅ Response status:', response.status);
    console.log('📊 Messages found:', response.data?.data?.length || 0);
    
  } catch (error) {
    console.log('❌ Error:', error.response?.status, error.response?.data?.message || error.message);
    
    if (error.response?.status === 403) {
      console.log('🔒 Access denied - this indicates the RBAC system is working');
      console.log('💡 The issue is likely that we need a valid JWT token for authentication');
    } else if (error.response?.status === 401) {
      console.log('🔐 Unauthorized - authentication required');
    }
  }
  
  // 3. Test the health endpoint to make sure server is running
  console.log('\n🏥 Testing health endpoint...');
  try {
    const healthResponse = await axios.get('http://localhost:5001/api/health');
    console.log('✅ Health check passed:', healthResponse.data);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
  }
}

// Run the test
testMessageEndpointWithAuth().catch(console.error);
