const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
let authToken = '';

// Test user credentials
const testUser = {
  email: 'admin@peak1031.com',
  password: 'admin123'
};

async function testSms2FA() {
  console.log('🔐 Testing SMS 2FA System\n');

  try {
    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, testUser);
    authToken = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Setup SMS 2FA
    console.log('2️⃣ Setting up SMS 2FA...');
    const setupResponse = await axios.post(`${BASE_URL}/auth/setup-sms-2fa`, {
      phoneNumber: '+15551234567' // Replace with real phone number
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ SMS 2FA setup response:', setupResponse.data);

    // Step 3: Send verification code
    console.log('\n3️⃣ Sending verification code...');
    const sendCodeResponse = await axios.post(`${BASE_URL}/auth/send-sms-2fa`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Send code response:', sendCodeResponse.data);

    // Step 4: Verify code (simulate with a test code)
    console.log('\n4️⃣ Verifying code...');
    const verifyResponse = await axios.post(`${BASE_URL}/auth/verify-sms-2fa`, {
      code: '123456' // This would be the actual code from SMS
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Verify response:', verifyResponse.data);

    console.log('\n🎉 SMS 2FA test completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n💡 Note: You may need to:');
      console.log('1. Configure Twilio credentials in .env file');
      console.log('2. Use a real phone number for testing');
      console.log('3. Check the actual SMS code sent to your phone');
    }
  }
}

// Run the test
testSms2FA();
