const axios = require('axios');

async function testExchangeAuth() {
  console.log('🔍 Testing exchange authorization...');
  
  try {
    // Login to get a valid token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    
    console.log('👤 User info:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    // Get exchange details
    console.log('\n📋 Getting exchange details...');
    const exchangeResponse = await axios.get(
      'http://localhost:5001/api/exchanges/ba7865ac-da20-404a-b609-804d15cb0467',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const exchange = exchangeResponse.data;
    console.log('🏢 Exchange info:', {
      id: exchange.id,
      name: exchange.name,
      coordinator_id: exchange.coordinator_id,
      user_id: user.id,
      isCoordinator: exchange.coordinator_id === user.id,
      userRole: user.role,
      isAdmin: user.role === 'admin'
    });
    
    // Test the authorization logic
    const userRole = user.role;
    const isCoordinator = exchange.coordinator_id === user.id;
    const canInvite = userRole === 'admin' || isCoordinator;
    
    console.log('\n🔐 Authorization check:');
    console.log(`  User role: ${userRole}`);
    console.log(`  Is coordinator: ${isCoordinator}`);
    console.log(`  Can invite: ${canInvite}`);
    
    if (!canInvite) {
      console.log('❌ User cannot invite to this exchange');
    } else {
      console.log('✅ User can invite to this exchange');
    }
    
  } catch (error) {
    console.error('❌ Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

testExchangeAuth().catch(console.error);

