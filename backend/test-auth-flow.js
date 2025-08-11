require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testAuthFlow() {
  const API_URL = process.env.API_URL || 'http://localhost:5001/api';
  
  try {
    console.log('🔐 Testing authentication flow...\n');
    
    // 1. Login
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'Peak2024!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('🎫 Token received:', token.substring(0, 20) + '...');
    
    // 2. Decode token
    console.log('\n2️⃣ Decoding token...');
    const decoded = jwt.decode(token);
    console.log('📋 Token payload:');
    console.log(JSON.stringify(decoded, null, 2));
    
    // 3. Make authenticated request to get user profile
    console.log('\n3️⃣ Testing authenticated request...');
    const profileResponse = await axios.get(`${API_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ Profile retrieved:');
    console.log(JSON.stringify(profileResponse.data, null, 2));
    
    // 4. Check what req.user would contain
    console.log('\n4️⃣ What req.user contains:');
    console.log('   ID from token:', decoded.userId || decoded.id);
    console.log('   ID from profile:', profileResponse.data.user?.id || profileResponse.data.id);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testAuthFlow();