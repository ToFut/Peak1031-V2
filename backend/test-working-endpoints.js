#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5001';
const TEST_EMAIL = process.env.TEST_EMAIL || 'admin@peak1031.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'admin123';

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  total: 0,
  details: []
};

// Utility functions
const log = {
  info: (msg) => console.log(`ℹ️  ${msg}`.blue),
  success: (msg) => console.log(`✅ ${msg}`.green),
  error: (msg) => console.log(`❌ ${msg}`.red),
  warning: (msg) => console.log(`⚠️  ${msg}`.yellow),
  header: (msg) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`.cyan)
};

const recordTest = (endpoint, method, status, response, error = null) => {
  const result = {
    endpoint,
    method,
    status,
    success: status >= 200 && status < 300,
    response: response?.data || null,
    error: error?.message || null,
    timestamp: new Date().toISOString()
  };
  
  testResults.details.push(result);
  testResults.total++;
  
  if (result.success) {
    testResults.passed++;
    log.success(`${method} ${endpoint} - ${status}`);
  } else {
    testResults.failed++;
    log.error(`${method} ${endpoint} - ${status} - ${error?.message || 'Unknown error'}`);
  }
  
  return result;
};

// Authentication helper
let authToken = null;

const authenticate = async () => {
  try {
    log.info('Authenticating...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.token;
    log.success('Authentication successful');
    return true;
  } catch (error) {
    log.error(`Authentication failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
};

const getAuthHeaders = () => ({
  'Authorization': `Bearer ${authToken}`,
  'Content-Type': 'application/json'
});

// Test functions for working endpoints
const testHealthEndpoints = async () => {
  log.header('Testing Health & Debug Endpoints');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    recordTest('/api/health', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/health', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api`);
    recordTest('/api', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/debug/users`);
    recordTest('/api/debug/users', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/debug/users', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/debug/token`, getAuthHeaders());
    recordTest('/api/debug/token', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/debug/token', 'GET', error.response?.status || 500, null, error);
  }
};

const testAuthEndpoints = async () => {
  log.header('Testing Authentication Endpoints');
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    recordTest('/api/auth/login', 'POST', response.status, response);
  } catch (error) {
    recordTest('/api/auth/login', 'POST', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/logout`, {}, getAuthHeaders());
    recordTest('/api/auth/logout', 'POST', response.status, response);
  } catch (error) {
    recordTest('/api/auth/logout', 'POST', error.response?.status || 500, null, error);
  }
};

const testDataEndpoints = async () => {
  log.header('Testing Core Data Endpoints');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/contacts`, getAuthHeaders());
    recordTest('/api/contacts', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/contacts', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/exchanges`, getAuthHeaders());
    recordTest('/api/exchanges', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/exchanges', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/exchanges?page=1&limit=10`, getAuthHeaders());
    recordTest('/api/exchanges?page=1&limit=10', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/exchanges?page=1&limit=10', 'GET', error.response?.status || 500, null, error);
  }
};

const testEndpointDetails = async () => {
  log.header('Testing Endpoint Response Details');
  
  // Test health endpoint details
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('\n📋 Health Endpoint Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Health endpoint failed:', error.message);
  }
  
  // Test API info endpoint details
  try {
    const response = await axios.get(`${BASE_URL}/api`);
    console.log('\n📋 API Info Endpoint Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ API info endpoint failed:', error.message);
  }
  
  // Test debug users endpoint details
  try {
    const response = await axios.get(`${BASE_URL}/api/debug/users`);
    console.log('\n📋 Debug Users Endpoint Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Debug users endpoint failed:', error.message);
  }
  
  // Test contacts endpoint details
  try {
    const response = await axios.get(`${BASE_URL}/api/contacts`, getAuthHeaders());
    console.log('\n📋 Contacts Endpoint Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Contacts endpoint failed:', error.message);
  }
  
  // Test exchanges endpoint details
  try {
    const response = await axios.get(`${BASE_URL}/api/exchanges`, getAuthHeaders());
    console.log('\n📋 Exchanges Endpoint Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Exchanges endpoint failed:', error.message);
  }
};

const generateReport = () => {
  log.header('Working Endpoints Test Results');
  
  console.log(`\n📊 Test Results:`);
  console.log(`   Total Tests: ${testResults.total}`.white);
  console.log(`   ✅ Passed: ${testResults.passed}`.green);
  console.log(`   ❌ Failed: ${testResults.failed}`.red);
  console.log(`   📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`.cyan);
  
  if (testResults.failed > 0) {
    log.warning('\n❌ Failed Tests:');
    testResults.details
      .filter(test => !test.success)
      .forEach(test => {
        console.log(`   ${test.method} ${test.endpoint} - ${test.status} - ${test.error || 'Unknown error'}`.red);
      });
  }
  
  log.success('\n✅ Successful Tests:');
  testResults.details
    .filter(test => test.success)
    .forEach(test => {
      console.log(`   ${test.method} ${test.endpoint} - ${test.status}`.green);
    });
  
  // Save detailed results to file
  const fs = require('fs');
  const reportPath = `working-endpoints-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log.info(`\n📄 Detailed results saved to: ${reportPath}`);
};

// Main test runner
const runWorkingEndpointTests = async () => {
  log.header('Peak 1031 Working Endpoints Test Suite');
  
  console.log(`\n🚀 Testing only the working endpoints...`);
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👤 Test User: ${TEST_EMAIL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
  
  try {
    // Test health endpoints first
    await testHealthEndpoints();
    
    // Authenticate
    const authSuccess = await authenticate();
    if (!authSuccess) {
      log.error('Authentication failed. Some tests may fail due to missing auth token.');
    }
    
    // Test authentication endpoints
    await testAuthEndpoints();
    
    // Test data endpoints
    await testDataEndpoints();
    
    // Test endpoint details
    await testEndpointDetails();
    
    // Generate final report
    generateReport();
    
  } catch (error) {
    log.error(`Test suite failed with error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
};

// Run the tests
if (require.main === module) {
  runWorkingEndpointTests().then(() => {
    log.success('\n🎉 Working endpoints test completed!');
    process.exit(0);
  }).catch(error => {
    log.error(`\n💥 Test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runWorkingEndpointTests,
  testResults
}; 