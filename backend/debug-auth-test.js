#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const TEST_EMAIL = 'admin@peak1031.com';
const TEST_PASSWORD = 'admin123';

async function debugAuthTest() {
  console.log('🔍 Debugging Authentication Flow...\n');
  
  // Step 1: Test login
  console.log('1️⃣ Testing login...');
  try {
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    console.log('✅ Login successful');
    console.log('📄 Response status:', loginResponse.status);
    console.log('🔑 Token received:', loginResponse.data.token ? 'YES' : 'NO');
    console.log('👤 User ID in token:', loginResponse.data.user.id);
    
    const token = loginResponse.data.token;
    
    // Step 2: Test token manually
    console.log('\n2️⃣ Testing token manually...');
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('🔑 Using token:', token.substring(0, 50) + '...');
    console.log('📋 Headers:', JSON.stringify(headers, null, 2));
    
    const testResponse = await axios.get(`${BASE_URL}/api/users`, { headers });
    console.log('✅ Manual token test successful');
    console.log('📄 Response status:', testResponse.status);
    console.log('📊 Users count:', testResponse.data.data?.length || 0);
    
    // Step 3: Test with axios defaults
    console.log('\n3️⃣ Testing with axios defaults...');
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    
    const defaultResponse = await axios.get(`${BASE_URL}/api/users`);
    console.log('✅ Axios defaults test successful');
    console.log('📄 Response status:', defaultResponse.status);
    
    // Step 4: Test other endpoints
    console.log('\n4️⃣ Testing other endpoints...');
    
    const endpoints = [
      '/api/contacts',
      '/api/exchanges', 
      '/api/dashboard/overview',
      '/api/tasks',
      '/api/documents'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(`${BASE_URL}${endpoint}`);
        console.log(`✅ ${endpoint} - ${response.status}`);
      } catch (error) {
        console.log(`❌ ${endpoint} - ${error.response?.status || 'ERROR'} - ${error.response?.data?.error || error.message}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Error:', error.response?.data || error.message);
  }
}

debugAuthTest().then(() => {
  console.log('\n🎉 Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('\n💥 Debug failed:', error);
  process.exit(1);
}); 