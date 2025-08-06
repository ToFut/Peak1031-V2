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

// Test functions
const testHealthAndDebug = async () => {
  log.header('Testing Health & Debug Endpoints');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    recordTest('/api/health', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/health', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/debug/users`);
    recordTest('/api/debug/users', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/debug/users', 'GET', error.response?.status || 500, null, error);
  }
};

const testAuthentication = async () => {
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

const testNewUserRoutes = async () => {
  log.header('Testing New User Management Routes');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/users`, getAuthHeaders());
    recordTest('/api/users', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/users', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/users/statistics/overview`, getAuthHeaders());
    recordTest('/api/users/statistics/overview', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/users/statistics/overview', 'GET', error.response?.status || 500, null, error);
  }
};

const testNewDashboardRoutes = async () => {
  log.header('Testing New Dashboard Routes');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/dashboard/overview`, getAuthHeaders());
    recordTest('/api/dashboard/overview', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/dashboard/overview', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/dashboard/exchange-metrics`, getAuthHeaders());
    recordTest('/api/dashboard/exchange-metrics', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/dashboard/exchange-metrics', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/dashboard/deadlines`, getAuthHeaders());
    recordTest('/api/dashboard/deadlines', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/dashboard/deadlines', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/dashboard/financial-summary`, getAuthHeaders());
    recordTest('/api/dashboard/financial-summary', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/dashboard/financial-summary', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/dashboard/recent-activity`, getAuthHeaders());
    recordTest('/api/dashboard/recent-activity', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/dashboard/recent-activity', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/dashboard/user-activity`, getAuthHeaders());
    recordTest('/api/dashboard/user-activity', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/dashboard/user-activity', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/dashboard/alerts`, getAuthHeaders());
    recordTest('/api/dashboard/alerts', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/dashboard/alerts', 'GET', error.response?.status || 500, null, error);
  }
};

const testFixedRoutes = async () => {
  log.header('Testing Previously Broken Routes');
  
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
    const response = await axios.get(`${BASE_URL}/api/exchange-participants`, getAuthHeaders());
    recordTest('/api/exchange-participants', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/exchange-participants', 'GET', error.response?.status || 500, null, error);
  }
};

const testExistingRoutes = async () => {
  log.header('Testing Existing Working Routes');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/tasks`, getAuthHeaders());
    recordTest('/api/tasks', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/tasks', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/documents`, getAuthHeaders());
    recordTest('/api/documents', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/documents', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/messages`, getAuthHeaders());
    recordTest('/api/messages', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/messages', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/notifications`, getAuthHeaders());
    recordTest('/api/notifications', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/notifications', 'GET', error.response?.status || 500, null, error);
  }
  
  try {
    const response = await axios.get(`${BASE_URL}/api/admin/users`, getAuthHeaders());
    recordTest('/api/admin/users', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/admin/users', 'GET', error.response?.status || 500, null, error);
  }
};

const generateReport = () => {
  log.header('Comprehensive Fix Test Results');
  
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
  const reportPath = `comprehensive-fix-test-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log.info(`\n📄 Detailed results saved to: ${reportPath}`);
};

// Main test runner
const runComprehensiveTest = async () => {
  log.header('Peak 1031 Comprehensive Fix Test Suite');
  
  console.log(`\n🚀 Testing all fixes comprehensively...`);
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👤 Test User: ${TEST_EMAIL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
  
  try {
    // Test health and debug endpoints
    await testHealthAndDebug();
    
    // Authenticate
    const authSuccess = await authenticate();
    if (!authSuccess) {
      log.error('Authentication failed. Some tests may fail due to missing auth token.');
    }
    
    // Test authentication endpoints
    await testAuthentication();
    
    // Test new user routes
    await testNewUserRoutes();
    
    // Test new dashboard routes
    await testNewDashboardRoutes();
    
    // Test previously broken routes
    await testFixedRoutes();
    
    // Test existing routes
    await testExistingRoutes();
    
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
  runComprehensiveTest().then(() => {
    log.success('\n🎉 Comprehensive fix test completed!');
    process.exit(0);
  }).catch(error => {
    log.error(`\n💥 Test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runComprehensiveTest,
  testResults
}; 