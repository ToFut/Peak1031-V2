require('dotenv').config();
const AuthService = require('./services/auth');

async function testAuth() {
  try {
    console.log('🔍 Testing authentication for agency@peak1031.com...');
    
    const user = await AuthService.authenticateUser('agency@peak1031.com', 'agency123');
    
    console.log('✅ Authentication successful!');
    console.log('User:', {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.first_name || user.firstName,
      lastName: user.last_name || user.lastName
    });
    
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
  }
}

testAuth();



