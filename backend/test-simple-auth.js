#!/usr/bin/env node

const axios = require('axios');

const BASE_URL = 'http://localhost:5001';
const TEST_EMAIL = 'admin@peak1031.com';
const TEST_PASSWORD = 'admin123';

async function testSimpleAuth() {
  console.log('🔍 Testing simple authentication...');
  
  try {
    // Step 1: Login
    console.log('\n1. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('Token:', token.substring(0, 50) + '...');
    
    // Step 2: Test contacts endpoint
    console.log('\n2. Testing contacts endpoint...');
    const contactsResponse = await axios.get(`${BASE_URL}/api/contacts`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Contacts endpoint successful');
    console.log('Response status:', contactsResponse.status);
    console.log('Contacts count:', contactsResponse.data.length || 'N/A');
    
    // Step 3: Test exchanges endpoint
    console.log('\n3. Testing exchanges endpoint...');
    const exchangesResponse = await axios.get(`${BASE_URL}/api/exchanges`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Exchanges endpoint successful');
    console.log('Response status:', exchangesResponse.status);
    console.log('Exchanges count:', exchangesResponse.data.length || 'N/A');
    
    // Step 4: Test new users endpoint
    console.log('\n4. Testing new users endpoint...');
    const usersResponse = await axios.get(`${BASE_URL}/api/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Users endpoint successful');
    console.log('Response status:', usersResponse.status);
    console.log('Users count:', usersResponse.data.data?.length || 'N/A');
    
    // Step 5: Test new dashboard endpoint
    console.log('\n5. Testing new dashboard endpoint...');
    const dashboardResponse = await axios.get(`${BASE_URL}/api/dashboard/overview`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Dashboard endpoint successful');
    console.log('Response status:', dashboardResponse.status);
    console.log('Dashboard data:', JSON.stringify(dashboardResponse.data, null, 2));
    
    console.log('\n🎉 All tests passed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

testSimpleAuth(); 