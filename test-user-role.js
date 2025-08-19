const axios = require('axios');

async function testUserRole() {
  console.log('🔍 Testing user role...');
  
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
      role: user.role,
      roleType: typeof user.role,
      hasRole: user.hasOwnProperty('role')
    });
    
    // Test the role check logic
    const allowedRoles = ['admin', 'coordinator'];
    const userRole = user.role;
    const isAdmin = userRole === 'admin';
    const isCoordinator = userRole === 'coordinator';
    const isAllowed = allowedRoles.includes(userRole);
    
    console.log('\n🔐 Role check logic:');
    console.log(`  User role: "${userRole}"`);
    console.log(`  Allowed roles: ${allowedRoles.join(', ')}`);
    console.log(`  Is admin: ${isAdmin}`);
    console.log(`  Is coordinator: ${isCoordinator}`);
    console.log(`  Is allowed: ${isAllowed}`);
    
    // Test the authorization logic
    if (userRole !== 'admin' && !isCoordinator) {
      console.log('❌ User would be denied access');
    } else {
      console.log('✅ User would be granted access');
    }
    
  } catch (error) {
    console.error('❌ Error:', {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message
    });
  }
}

testUserRole().catch(console.error);

