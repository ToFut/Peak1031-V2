#!/usr/bin/env node

/**
 * Comprehensive API Testing Script for Peak1031
 * Tests all major backend endpoints with authentication and error handling
 */

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = 'http://localhost:5001/api';
const TEST_CREDENTIALS = {
  admin: { email: 'admin@peak1031.com', password: 'admin123' },
  coordinator: { email: 'coordinator@peak1031.com', password: 'coordinator123' },
  client: { email: 'client@peak1031.com', password: 'client123' }
};

// Test results tracking
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  errors: []
};

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  const prefix = `[${timestamp}]`;
  
  switch (type) {
    case 'success':
      console.log(`${prefix} ✅ ${message}`.green);
      break;
    case 'error':
      console.log(`${prefix} ❌ ${message}`.red);
      break;
    case 'warning':
      console.log(`${prefix} ⚠️  ${message}`.yellow);
      break;
    case 'info':
      console.log(`${prefix} ℹ️  ${message}`.blue);
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
};

const testEndpoint = async (name, method, endpoint, data = null, token = null, expectedStatus = 200) => {
  results.total++;
  
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    
    if (response.status === expectedStatus) {
      log(`${name}: PASSED (${response.status})`, 'success');
      results.passed++;
      return response.data;
    } else {
      log(`${name}: FAILED - Expected ${expectedStatus}, got ${response.status}`, 'error');
      results.failed++;
      results.errors.push(`${name}: Status ${response.status} instead of ${expectedStatus}`);
    }
  } catch (error) {
    const status = error.response?.status || 'Network Error';
    log(`${name}: FAILED - ${status}`, 'error');
    results.failed++;
    results.errors.push(`${name}: ${error.message}`);
  }
  
  return null;
};

// Authentication tests
const testAuthentication = async () => {
  log('🔐 Testing Authentication Endpoints...', 'info');
  
  // Test login endpoints
  await testEndpoint('Admin Login', 'POST', '/auth/login', TEST_CREDENTIALS.admin);
  await testEndpoint('Coordinator Login', 'POST', '/auth/login', TEST_CREDENTIALS.coordinator);
  await testEndpoint('Client Login', 'POST', '/auth/login', TEST_CREDENTIALS.client);
  
  // Test invalid login
  await testEndpoint('Invalid Login', 'POST', '/auth/login', 
    { email: 'invalid@test.com', password: 'wrong' }, null, 401);
  
  // Test logout
  await testEndpoint('Logout', 'POST', '/auth/logout');
};

// Health and system tests
const testSystemEndpoints = async () => {
  log('🏥 Testing System Endpoints...', 'info');
  
  await testEndpoint('Health Check', 'GET', '/health');
  await testEndpoint('API Status', 'GET', '/status');
  await testEndpoint('Database Status', 'GET', '/db/status');
};

// User management tests
const testUserEndpoints = async (adminToken) => {
  log('👥 Testing User Management Endpoints...', 'info');
  
  await testEndpoint('Get All Users', 'GET', '/users', null, adminToken);
  await testEndpoint('Get User Profile', 'GET', '/users/profile', null, adminToken);
  await testEndpoint('Get User by ID', 'GET', '/users/d3af6a77-6766-435f-8313-a3be252f269f', null, adminToken);
  
  // Test user creation (if endpoint exists)
  const newUser = {
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
    role: 'client',
    password: 'testpass123'
  };
  await testEndpoint('Create User', 'POST', '/users', newUser, adminToken);
};

// Contact management tests
const testContactEndpoints = async (token) => {
  log('📞 Testing Contact Management Endpoints...', 'info');
  
  await testEndpoint('Get All Contacts', 'GET', '/contacts', null, token);
  await testEndpoint('Get Contacts by Exchange', 'GET', '/contacts?exchange_id=test', null, token);
  
  const newContact = {
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    company: 'Test Company'
  };
  await testEndpoint('Create Contact', 'POST', '/contacts', newContact, token);
};

// Exchange management tests
const testExchangeEndpoints = async (token) => {
  log('🏢 Testing Exchange Management Endpoints...', 'info');
  
  await testEndpoint('Get All Exchanges', 'GET', '/exchanges', null, token);
  await testEndpoint('Get Exchange by ID', 'GET', '/exchanges/test-id', null, token);
  await testEndpoint('Get User Exchanges', 'GET', '/exchanges/user', null, token);
  
  const newExchange = {
    name: 'Test Exchange',
    address: '123 Test St, Test City, TS 12345',
    status: 'pending',
    client_id: 'test-client-id'
  };
  await testEndpoint('Create Exchange', 'POST', '/exchanges', newExchange, token);
};

// Document management tests
const testDocumentEndpoints = async (token) => {
  log('📄 Testing Document Management Endpoints...', 'info');
  
  await testEndpoint('Get All Documents', 'GET', '/documents', null, token);
  await testEndpoint('Get Documents by Category', 'GET', '/documents?category=contract', null, token);
  await testEndpoint('Get Document by ID', 'GET', '/documents/test-id', null, token);
  
  const newDocument = {
    fileName: 'test-document.pdf',
    category: 'contract',
    exchange_id: 'test-exchange-id',
    fileSize: 1024
  };
  await testEndpoint('Create Document', 'POST', '/documents', newDocument, token);
};

// Task management tests
const testTaskEndpoints = async (token) => {
  log('📋 Testing Task Management Endpoints...', 'info');
  
  await testEndpoint('Get All Tasks', 'GET', '/tasks', null, token);
  await testEndpoint('Get Tasks by Status', 'GET', '/tasks?status=pending', null, token);
  await testEndpoint('Get Task by ID', 'GET', '/tasks/test-id', null, token);
  
  const newTask = {
    title: 'Test Task',
    description: 'This is a test task',
    priority: 'medium',
    status: 'pending',
    exchange_id: 'test-exchange-id'
  };
  await testEndpoint('Create Task', 'POST', '/tasks', newTask, token);
};

// Message management tests
const testMessageEndpoints = async (token) => {
  log('💬 Testing Message Management Endpoints...', 'info');
  
  await testEndpoint('Get All Messages', 'GET', '/messages', null, token);
  await testEndpoint('Get Messages by Exchange', 'GET', '/messages?exchange_id=test', null, token);
  await testEndpoint('Get Message by ID', 'GET', '/messages/test-id', null, token);
  
  const newMessage = {
    content: 'Test message content',
    exchange_id: 'test-exchange-id',
    sender_id: 'test-user-id'
  };
  await testEndpoint('Create Message', 'POST', '/messages', newMessage, token);
};

// Report endpoints tests
const testReportEndpoints = async (token) => {
  log('📊 Testing Report Endpoints...', 'info');
  
  await testEndpoint('Get Exchange Reports', 'GET', '/reports/exchanges', null, token);
  await testEndpoint('Get Document Reports', 'GET', '/reports/documents', null, token);
  await testEndpoint('Get User Reports', 'GET', '/reports/users', null, token);
  await testEndpoint('Get Task Reports', 'GET', '/reports/tasks', null, token);
  
  const reportFilters = {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    exchangeId: 'test-exchange-id'
  };
  await testEndpoint('Generate Custom Report', 'POST', '/reports/custom', reportFilters, token);
};

// Template management tests
const testTemplateEndpoints = async (token) => {
  log('📝 Testing Template Management Endpoints...', 'info');
  
  await testEndpoint('Get All Templates', 'GET', '/templates', null, token);
  await testEndpoint('Get Template by ID', 'GET', '/templates/test-id', null, token);
  
  const newTemplate = {
    name: 'Test Template',
    category: 'contract',
    content: 'This is a test template content',
    variables: ['client_name', 'property_address']
  };
  await testEndpoint('Create Template', 'POST', '/templates', newTemplate, token);
};

// Admin-specific tests
const testAdminEndpoints = async (adminToken) => {
  log('🔧 Testing Admin-Specific Endpoints...', 'info');
  
  await testEndpoint('Get System Stats', 'GET', '/admin/stats', null, adminToken);
  await testEndpoint('Get Audit Logs', 'GET', '/admin/audit-logs', null, adminToken);
  await testEndpoint('Get Database Status', 'GET', '/admin/db/status', null, adminToken);
  await testEndpoint('Get User Activity', 'GET', '/admin/users/activity', null, adminToken);
};

// Performance tests
const testPerformance = async (token) => {
  log('⚡ Testing Performance Endpoints...', 'info');
  
  const startTime = Date.now();
  await testEndpoint('Performance Test - Users', 'GET', '/users', null, token);
  const userTime = Date.now() - startTime;
  
  const startTime2 = Date.now();
  await testEndpoint('Performance Test - Exchanges', 'GET', '/exchanges', null, token);
  const exchangeTime = Date.now() - startTime2;
  
  log(`User endpoint response time: ${userTime}ms`, userTime < 1000 ? 'success' : 'warning');
  log(`Exchange endpoint response time: ${exchangeTime}ms`, exchangeTime < 1000 ? 'success' : 'warning');
};

// Main test runner
const runAllTests = async () => {
  console.log('\n🚀 Starting Comprehensive API Tests for Peak1031\n'.cyan.bold);
  
  try {
    // Test system endpoints first
    await testSystemEndpoints();
    
    // Test authentication
    await testAuthentication();
    
    // Get admin token for protected endpoints
    const adminLoginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_CREDENTIALS.admin);
    const adminToken = adminLoginResponse.data?.token;
    
    if (adminToken) {
      log('✅ Admin authentication successful', 'success');
      
      // Test all endpoints with admin token
      await testUserEndpoints(adminToken);
      await testContactEndpoints(adminToken);
      await testExchangeEndpoints(adminToken);
      await testDocumentEndpoints(adminToken);
      await testTaskEndpoints(adminToken);
      await testMessageEndpoints(adminToken);
      await testReportEndpoints(adminToken);
      await testTemplateEndpoints(adminToken);
      await testAdminEndpoints(adminToken);
      await testPerformance(adminToken);
    } else {
      log('❌ Admin authentication failed', 'error');
    }
    
    // Test with coordinator token
    const coordinatorLoginResponse = await axios.post(`${BASE_URL}/auth/login`, TEST_CREDENTIALS.coordinator);
    const coordinatorToken = coordinatorLoginResponse.data?.token;
    
    if (coordinatorToken) {
      log('✅ Coordinator authentication successful', 'success');
      await testContactEndpoints(coordinatorToken);
      await testExchangeEndpoints(coordinatorToken);
      await testDocumentEndpoints(coordinatorToken);
      await testTaskEndpoints(coordinatorToken);
      await testMessageEndpoints(coordinatorToken);
      await testReportEndpoints(coordinatorToken);
    }
    
  } catch (error) {
    log(`❌ Test suite failed: ${error.message}`, 'error');
  }
  
  // Print results
  console.log('\n📊 Test Results Summary:'.cyan.bold);
  console.log(`Total Tests: ${results.total}`.white);
  console.log(`Passed: ${results.passed}`.green);
  console.log(`Failed: ${results.failed}`.red);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`.yellow);
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:'.red.bold);
    results.errors.forEach(error => console.log(`  - ${error}`.red));
  }
  
  console.log('\n🎯 Test Suite Complete!'.cyan.bold);
};

// Run the tests
runAllTests().catch(console.error); 