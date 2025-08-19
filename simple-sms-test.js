const axios = require('axios');

async function simpleTest() {
  console.log('🔍 Simple SMS 2FA Test\n');

  try {
    // Login
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // Setup SMS 2FA
    console.log('\n📱 Setting up SMS 2FA...');
    const setupResponse = await axios.post('http://localhost:5001/api/auth/setup-sms-2fa', {
      phoneNumber: '+15551234567'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ Setup response:', setupResponse.data);

    // Get user data to see if code was stored
    console.log('\n👤 Getting user data...');
    const userResponse = await axios.get('http://localhost:5001/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log('✅ User data:', {
      twoFaEnabled: userResponse.data.twoFaEnabled,
      phone: userResponse.data.phone,
      twoFaSecret: userResponse.data.twoFaSecret
    });

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

simpleTest();
