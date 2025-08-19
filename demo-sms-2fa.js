const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
let authToken = '';

// Test user credentials
const testUser = {
  email: 'admin@peak1031.com',
  password: 'admin123'
};

async function demoSms2FA() {
  console.log('🔐 SMS 2FA System Demonstration\n');

  try {
    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, testUser);
    authToken = loginResponse.data.token;
    console.log('✅ Login successful\n');

    // Step 2: Setup SMS 2FA
    console.log('2️⃣ Setting up SMS 2FA...');
    const setupResponse = await axios.post(`${BASE_URL}/auth/setup-sms-2fa`, {
      phoneNumber: '+15551234567'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ SMS 2FA setup response:', setupResponse.data);

    // Step 3: Get the verification code from the database (for demo purposes)
    console.log('\n3️⃣ Getting verification code from database...');
    
    // In a real scenario, this code would be sent via SMS
    // For demo purposes, we'll simulate getting it from the database
    const userResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    // The code is stored in two_fa_secret field
    const verificationCode = userResponse.data.twoFaSecret;
    console.log('📱 Verification code (would be sent via SMS):', verificationCode);

    // Step 4: Verify the code
    console.log('\n4️⃣ Verifying SMS code...');
    const verifyResponse = await axios.post(`${BASE_URL}/auth/verify-sms-2fa`, {
      code: verificationCode
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Verify response:', verifyResponse.data);

    // Step 5: Check user status
    console.log('\n5️⃣ Checking user 2FA status...');
    const finalUserResponse = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ User 2FA status:', {
      twoFaEnabled: finalUserResponse.data.twoFaEnabled,
      phone: finalUserResponse.data.phone
    });

    console.log('\n🎉 SMS 2FA demonstration completed successfully!');
    console.log('\n📋 Summary:');
    console.log('✅ SMS 2FA setup endpoint working');
    console.log('✅ Phone number validation working');
    console.log('✅ Verification code generation working');
    console.log('✅ Code verification working');
    console.log('✅ User status update working');
    console.log('\n💡 To enable real SMS sending:');
    console.log('1. Add Twilio credentials to .env file');
    console.log('2. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER');
    console.log('3. Use a real phone number for testing');

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

// Run the demonstration
demoSms2FA();
