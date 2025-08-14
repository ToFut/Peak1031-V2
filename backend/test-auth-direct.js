require('dotenv').config();
const AuthService = require('./services/auth');

async function testAuth() {
  try {
    console.log('🔍 Testing authentication...');
    const user = await AuthService.authenticateUser('admin@peak1031.com', 'admin123');
    console.log('✅ Authentication successful:', user.email);
  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
  }
}

testAuth();








