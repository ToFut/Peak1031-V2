#!/usr/bin/env node

/**
 * Test Reports API Endpoints
 * Tests actual HTTP endpoints with different user roles
 */

const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

// Test user credentials - replace with actual test users
const TEST_USERS = [
  {
    email: 'joshuam@peakexchange.com',
    role: 'admin',
    password: 'admin123' // You may need to update this
  },
  {
    email: 'agency@peak1031.com', 
    role: 'agency',
    password: 'agency123' // You may need to update this
  },
  {
    email: 'test-client@peak1031.com',
    role: 'client', 
    password: 'client123' // You may need to update this
  }
];

async function loginUser(email, password) {
  try {
    console.log(`🔑 Logging in: ${email}`);
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password
    });
    
    if (response.data.success) {
      console.log(`   ✅ Login successful for ${email}`);
      return response.data.token;
    } else {
      console.log(`   ❌ Login failed for ${email}:`, response.data.error);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ Login error for ${email}:`, error.response?.data?.error || error.message);
    return null;
  }
}

async function testReportEndpoint(endpoint, token, userEmail, expectedData = {}) {
  try {
    console.log(`📊 Testing ${endpoint} for ${userEmail}`);
    const response = await axios.get(`${API_BASE}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        startDate: '2024-01-01',
        endDate: '2025-12-31'
      }
    });
    
    if (response.data.success) {
      console.log(`   ✅ ${endpoint} successful`);
      console.log(`   📈 Data:`, JSON.stringify(response.data.data, null, 2));
      return response.data.data;
    } else {
      console.log(`   ❌ ${endpoint} failed:`, response.data.error);
      return null;
    }
  } catch (error) {
    console.log(`   ❌ ${endpoint} error:`, error.response?.data?.error || error.message);
    console.log(`   📄 Status: ${error.response?.status}`);
    return null;
  }
}

async function testAllEndpointsForUser(user) {
  console.log(`\n👤 TESTING USER: ${user.email} (${user.role})`);
  console.log('=' .repeat(60));
  
  // Login first
  const token = await loginUser(user.email, user.password);
  if (!token) {
    console.log(`❌ Skipping ${user.email} - login failed`);
    return;
  }
  
  // Test available endpoints based on role
  const endpoints = [
    '/mobile-reports/overview',
    '/mobile-reports/financial', 
    '/mobile-reports/exchanges',
    '/mobile-reports/users',
    '/mobile-reports/tasks',
    '/mobile-reports/audit'
  ];
  
  for (const endpoint of endpoints) {
    await testReportEndpoint(endpoint, token, user.email);
    console.log(''); // Add spacing
  }
}

async function runAPITests() {
  console.log('🚀 TESTING REPORTS API ENDPOINTS');
  console.log('=' .repeat(70));
  
  // Test server connection first
  try {
    const healthCheck = await axios.get(`${API_BASE}/health`);
    console.log('✅ Server is responding');
  } catch (error) {
    console.log('❌ Server not responding:', error.message);
    return;
  }
  
  // Test each user
  for (const user of TEST_USERS) {
    await testAllEndpointsForUser(user);
  }
  
  console.log('\n✨ API TESTS COMPLETED');
  console.log('=' .repeat(70));
}

// Quick test function for immediate debugging
async function quickTest() {
  console.log('🔍 QUICK API TEST');
  console.log('=' .repeat(30));
  
  try {
    // Test without auth first to see error handling
    console.log('\n📊 Testing /mobile-reports/overview without auth:');
    const response = await axios.get(`${API_BASE}/mobile-reports/overview`);
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Expected auth error:', error.response?.data?.error || error.message);
  }
  
  try {
    // Test health endpoint
    console.log('\n🏥 Testing health endpoint:');
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('Health check:', healthResponse.data);
  } catch (error) {
    console.log('Health check error:', error.message);
  }
}

// Run tests
const args = process.argv.slice(2);
if (args.includes('--quick')) {
  quickTest().catch(console.error);
} else {
  runAPITests().catch(console.error);
}