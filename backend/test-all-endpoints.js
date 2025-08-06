#!/usr/bin/env node

const axios = require('axios');
const colors = require('colors');

// Configuration
const BASE_URL = process.env.BACKEND_URL || 'http://localhost:5002';
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
let refreshToken = null;

const authenticate = async () => {
  try {
    log.info('Authenticating...');
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    authToken = response.data.token;
    refreshToken = response.data.refreshToken;
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
const testHealthCheck = async () => {
  log.header('Testing Health Check Endpoints');
  
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
};

const testDebugEndpoints = async () => {
  log.header('Testing Debug Endpoints');
  
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
  
  // Test login
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    recordTest('/api/auth/login', 'POST', response.status, response);
  } catch (error) {
    recordTest('/api/auth/login', 'POST', error.response?.status || 500, null, error);
  }
  
  // Test logout
  try {
    const response = await axios.post(`${BASE_URL}/api/auth/logout`, {}, getAuthHeaders());
    recordTest('/api/auth/logout', 'POST', response.status, response);
  } catch (error) {
    recordTest('/api/auth/logout', 'POST', error.response?.status || 500, null, error);
  }
  
  // Test refresh token
  if (refreshToken) {
    try {
      const response = await axios.post(`${BASE_URL}/api/auth/refresh`, {
        refreshToken
      });
      recordTest('/api/auth/refresh', 'POST', response.status, response);
    } catch (error) {
      recordTest('/api/auth/refresh', 'POST', error.response?.status || 500, null, error);
    }
  }
  
  // Test profile
  try {
    const response = await axios.get(`${BASE_URL}/api/auth/profile`, getAuthHeaders());
    recordTest('/api/auth/profile', 'GET', response.status, response);
  } catch (error) {
    recordTest('/api/auth/profile', 'GET', error.response?.status || 500, null, error);
  }
};

const testContactsEndpoints = async () => {
  log.header('Testing Contacts Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/contacts' },
    { method: 'POST', path: '/api/contacts', data: {
      first_name: 'Test',
      last_name: 'Contact',
      email: 'test@example.com',
      phone: '555-1234'
    }},
    { method: 'GET', path: '/api/contacts/1' },
    { method: 'PUT', path: '/api/contacts/1', data: {
      first_name: 'Updated',
      last_name: 'Contact'
    }},
    { method: 'DELETE', path: '/api/contacts/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testExchangesEndpoints = async () => {
  log.header('Testing Exchanges Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/exchanges' },
    { method: 'GET', path: '/api/exchanges?page=1&limit=10' },
    { method: 'GET', path: '/api/exchanges/1' },
    { method: 'POST', path: '/api/exchanges', data: {
      name: 'Test Exchange',
      description: 'Test exchange for testing',
      status: 'active'
    }},
    { method: 'PUT', path: '/api/exchanges/1', data: {
      name: 'Updated Exchange'
    }},
    { method: 'DELETE', path: '/api/exchanges/1' },
    { method: 'GET', path: '/api/exchanges/1/participants' },
    { method: 'GET', path: '/api/exchanges/1/tasks' },
    { method: 'GET', path: '/api/exchanges/1/documents' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testTasksEndpoints = async () => {
  log.header('Testing Tasks Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/tasks' },
    { method: 'GET', path: '/api/tasks?page=1&limit=10' },
    { method: 'GET', path: '/api/tasks/1' },
    { method: 'POST', path: '/api/tasks', data: {
      title: 'Test Task',
      description: 'Test task for testing',
      status: 'pending',
      priority: 'medium',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }},
    { method: 'PUT', path: '/api/tasks/1', data: {
      title: 'Updated Task'
    }},
    { method: 'PUT', path: '/api/tasks/1/status', data: {
      status: 'in_progress'
    }},
    { method: 'DELETE', path: '/api/tasks/1' },
    { method: 'GET', path: '/api/tasks/exchange/1' },
    { method: 'GET', path: '/api/tasks/user/1' },
    { method: 'GET', path: '/api/tasks/statistics' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testDocumentsEndpoints = async () => {
  log.header('Testing Documents Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/documents' },
    { method: 'GET', path: '/api/documents/1' },
    { method: 'POST', path: '/api/documents', data: {
      title: 'Test Document',
      description: 'Test document for testing',
      type: 'contract',
      status: 'draft'
    }},
    { method: 'PUT', path: '/api/documents/1', data: {
      title: 'Updated Document'
    }},
    { method: 'DELETE', path: '/api/documents/1' },
    { method: 'GET', path: '/api/documents/templates' },
    { method: 'GET', path: '/api/documents/templates/1' },
    { method: 'POST', path: '/api/documents/templates', data: {
      name: 'Test Template',
      content: 'Test template content',
      type: 'contract'
    }}
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testMessagesEndpoints = async () => {
  log.header('Testing Messages Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/messages' },
    { method: 'GET', path: '/api/messages/1' },
    { method: 'POST', path: '/api/messages', data: {
      content: 'Test message',
      exchange_id: 1,
      recipient_id: 1
    }},
    { method: 'PUT', path: '/api/messages/1', data: {
      content: 'Updated message'
    }},
    { method: 'DELETE', path: '/api/messages/1' },
    { method: 'GET', path: '/api/messages/exchange/1' },
    { method: 'GET', path: '/api/messages/user/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testNotificationsEndpoints = async () => {
  log.header('Testing Notifications Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/notifications' },
    { method: 'GET', path: '/api/notifications/1' },
    { method: 'POST', path: '/api/notifications', data: {
      title: 'Test Notification',
      message: 'Test notification message',
      type: 'info',
      user_id: 1
    }},
    { method: 'PUT', path: '/api/notifications/1/read' },
    { method: 'DELETE', path: '/api/notifications/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testAdminEndpoints = async () => {
  log.header('Testing Admin Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/admin/users' },
    { method: 'GET', path: '/api/admin/statistics' },
    { method: 'GET', path: '/api/admin/audit-logs' },
    { method: 'GET', path: '/api/admin/system-health' },
    { method: 'POST', path: '/api/admin/users', data: {
      email: 'newuser@example.com',
      password: 'password123',
      first_name: 'New',
      last_name: 'User',
      role: 'client'
    }},
    { method: 'PUT', path: '/api/admin/users/1', data: {
      role: 'coordinator'
    }},
    { method: 'DELETE', path: '/api/admin/users/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testEnterpriseEndpoints = async () => {
  log.header('Testing Enterprise Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/enterprise-exchanges' },
    { method: 'GET', path: '/api/enterprise-exchanges/1' },
    { method: 'POST', path: '/api/enterprise-exchanges', data: {
      name: 'Enterprise Exchange',
      description: 'Enterprise exchange for testing',
      status: 'active'
    }},
    { method: 'PUT', path: '/api/enterprise-exchanges/1', data: {
      name: 'Updated Enterprise Exchange'
    }},
    { method: 'DELETE', path: '/api/enterprise-exchanges/1' },
    { method: 'GET', path: '/api/account/profile' },
    { method: 'PUT', path: '/api/account/profile', data: {
      first_name: 'Updated',
      last_name: 'Profile'
    }},
    { method: 'PUT', path: '/api/account/password', data: {
      current_password: 'oldpassword',
      new_password: 'newpassword'
    }}
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testSyncEndpoints = async () => {
  log.header('Testing Sync Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/sync/status' },
    { method: 'POST', path: '/api/sync/start' },
    { method: 'POST', path: '/api/sync/stop' },
    { method: 'GET', path: '/api/sync/logs' },
    { method: 'POST', path: '/api/sync/contacts' },
    { method: 'POST', path: '/api/sync/exchanges' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testExportEndpoints = async () => {
  log.header('Testing Export Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/exports' },
    { method: 'POST', path: '/api/exports/exchanges', data: {
      format: 'csv',
      filters: { status: 'active' }
    }},
    { method: 'POST', path: '/api/exports/contacts', data: {
      format: 'xlsx'
    }},
    { method: 'GET', path: '/api/exports/1' },
    { method: 'DELETE', path: '/api/exports/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testOAuthEndpoints = async () => {
  log.header('Testing OAuth Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/oauth/providers' },
    { method: 'GET', path: '/api/oauth/authorize' },
    { method: 'POST', path: '/api/oauth/callback' },
    { method: 'GET', path: '/api/oauth/tokens' },
    { method: 'DELETE', path: '/api/oauth/tokens/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testExchangeParticipantsEndpoints = async () => {
  log.header('Testing Exchange Participants Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/exchange-participants' },
    { method: 'GET', path: '/api/exchange-participants/1' },
    { method: 'POST', path: '/api/exchange-participants', data: {
      exchange_id: 1,
      user_id: 1,
      role: 'client'
    }},
    { method: 'PUT', path: '/api/exchange-participants/1', data: {
      role: 'coordinator'
    }},
    { method: 'DELETE', path: '/api/exchange-participants/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testTemplatesEndpoints = async () => {
  log.header('Testing Templates Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/documents/templates' },
    { method: 'GET', path: '/api/documents/templates/1' },
    { method: 'POST', path: '/api/documents/templates', data: {
      name: 'Test Template',
      content: 'Test template content',
      type: 'contract',
      variables: ['client_name', 'exchange_name']
    }},
    { method: 'PUT', path: '/api/documents/templates/1', data: {
      name: 'Updated Template'
    }},
    { method: 'DELETE', path: '/api/documents/templates/1' },
    { method: 'POST', path: '/api/documents/templates/1/generate', data: {
      variables: {
        client_name: 'John Doe',
        exchange_name: 'Test Exchange'
      }
    }}
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testTestMessageEndpoints = async () => {
  log.header('Testing Test Message Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/test-messages' },
    { method: 'POST', path: '/api/test-messages', data: {
      message: 'Test message for testing'
    }},
    { method: 'GET', path: '/api/test-messages/1' },
    { method: 'DELETE', path: '/api/test-messages/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testPracticePartnerEndpoints = async () => {
  log.header('Testing Practice Partner Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/practice-partner/status' },
    { method: 'POST', path: '/api/practice-partner/sync' },
    { method: 'GET', path: '/api/practice-partner/contacts' },
    { method: 'GET', path: '/api/practice-partner/exchanges' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testEnhancedMessagesEndpoints = async () => {
  log.header('Testing Enhanced Messages Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/messages-enhanced' },
    { method: 'GET', path: '/api/messages-enhanced/1' },
    { method: 'POST', path: '/api/messages-enhanced', data: {
      content: 'Enhanced test message',
      exchange_id: 1,
      recipient_id: 1,
      type: 'notification'
    }},
    { method: 'PUT', path: '/api/messages-enhanced/1', data: {
      content: 'Updated enhanced message'
    }},
    { method: 'DELETE', path: '/api/messages-enhanced/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testTemplatesEnhancedEndpoints = async () => {
  log.header('Testing Enhanced Templates Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/templates-enhanced' },
    { method: 'GET', path: '/api/templates-enhanced/1' },
    { method: 'POST', path: '/api/templates-enhanced', data: {
      name: 'Enhanced Test Template',
      content: 'Enhanced template content',
      type: 'contract',
      category: 'legal'
    }},
    { method: 'PUT', path: '/api/templates-enhanced/1', data: {
      name: 'Updated Enhanced Template'
    }},
    { method: 'DELETE', path: '/api/templates-enhanced/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testTemplateDocumentsEndpoints = async () => {
  log.header('Testing Template Documents Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/template-documents' },
    { method: 'GET', path: '/api/template-documents/1' },
    { method: 'POST', path: '/api/template-documents', data: {
      name: 'Template Document',
      template_id: 1,
      exchange_id: 1,
      status: 'draft'
    }},
    { method: 'PUT', path: '/api/template-documents/1', data: {
      status: 'final'
    }},
    { method: 'DELETE', path: '/api/template-documents/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testExchangesUpdatedEndpoints = async () => {
  log.header('Testing Updated Exchanges Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/exchanges-updated' },
    { method: 'GET', path: '/api/exchanges-updated/1' },
    { method: 'POST', path: '/api/exchanges-updated', data: {
      name: 'Updated Exchange',
      description: 'Updated exchange for testing',
      status: 'active'
    }},
    { method: 'PUT', path: '/api/exchanges-updated/1', data: {
      name: 'Updated Exchange Name'
    }},
    { method: 'DELETE', path: '/api/exchanges-updated/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testMockEndpoints = async () => {
  log.header('Testing Mock Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/mock/users' },
    { method: 'GET', path: '/api/mock/exchanges' },
    { method: 'GET', path: '/api/mock/tasks' },
    { method: 'GET', path: '/api/mock/documents' },
    { method: 'GET', path: '/api/mock/messages' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testSyncRoutesEndpoints = async () => {
  log.header('Testing Sync Routes Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/sync-routes/status' },
    { method: 'POST', path: '/api/sync-routes/start' },
    { method: 'POST', path: '/api/sync-routes/stop' },
    { method: 'GET', path: '/api/sync-routes/logs' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testSupabaseAuthEndpoints = async () => {
  log.header('Testing Supabase Auth Endpoints');
  
  const endpoints = [
    { method: 'POST', path: '/api/auth/supabase/login', data: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }},
    { method: 'POST', path: '/api/auth/supabase/register', data: {
      email: 'newuser@example.com',
      password: 'password123',
      first_name: 'New',
      last_name: 'User'
    }},
    { method: 'POST', path: '/api/auth/supabase/logout' },
    { method: 'POST', path: '/api/auth/supabase/refresh' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testSupabaseExchangesEndpoints = async () => {
  log.header('Testing Supabase Exchanges Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/supabase-exchanges' },
    { method: 'GET', path: '/api/supabase-exchanges/1' },
    { method: 'POST', path: '/api/supabase-exchanges', data: {
      name: 'Supabase Exchange',
      description: 'Supabase exchange for testing',
      status: 'active'
    }},
    { method: 'PUT', path: '/api/supabase-exchanges/1', data: {
      name: 'Updated Supabase Exchange'
    }},
    { method: 'DELETE', path: '/api/supabase-exchanges/1' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testLegacyAuthEndpoints = async () => {
  log.header('Testing Legacy Auth Endpoints');
  
  const endpoints = [
    { method: 'POST', path: '/api/auth/legacy/login', data: {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    }},
    { method: 'POST', path: '/api/auth/legacy/register', data: {
      email: 'legacy@example.com',
      password: 'password123',
      first_name: 'Legacy',
      last_name: 'User'
    }},
    { method: 'POST', path: '/api/auth/legacy/logout' },
    { method: 'POST', path: '/api/auth/legacy/refresh' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testFilesEndpoints = async () => {
  log.header('Testing Files Endpoints');
  
  const endpoints = [
    { method: 'GET', path: '/api/files' },
    { method: 'GET', path: '/api/files/test.pdf' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
    }
  }
};

const testNonExistentEndpoints = async () => {
  log.header('Testing Non-Existent Endpoints (Should Return 404)');
  
  const endpoints = [
    { method: 'GET', path: '/api/nonexistent' },
    { method: 'POST', path: '/api/invalid-endpoint' },
    { method: 'PUT', path: '/api/unknown/123' },
    { method: 'DELETE', path: '/api/missing/456' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const config = {
        method: endpoint.method,
        url: `${BASE_URL}${endpoint.path}`,
        headers: getAuthHeaders()
      };
      
      if (endpoint.data) {
        config.data = endpoint.data;
      }
      
      const response = await axios(config);
      recordTest(endpoint.path, endpoint.method, response.status, response);
    } catch (error) {
      // For non-existent endpoints, we expect a 404
      if (error.response?.status === 404) {
        recordTest(endpoint.path, endpoint.method, 404, { data: { error: 'API endpoint not found' } });
      } else {
        recordTest(endpoint.path, endpoint.method, error.response?.status || 500, null, error);
      }
    }
  }
};

const generateReport = () => {
  log.header('Test Results Summary');
  
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
  const reportPath = `test-results-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
  log.info(`\n📄 Detailed results saved to: ${reportPath}`);
};

// Main test runner
const runAllTests = async () => {
  log.header('Peak 1031 Backend API Testing Suite');
  
  console.log(`\n🚀 Starting comprehensive API testing...`);
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`👤 Test User: ${TEST_EMAIL}`);
  console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
  
  try {
    // Test health check first
    await testHealthCheck();
    
    // Authenticate
    const authSuccess = await authenticate();
    if (!authSuccess) {
      log.error('Authentication failed. Some tests may fail due to missing auth token.');
    }
    
    // Test debug endpoints
    await testDebugEndpoints();
    
    // Test authentication endpoints
    await testAuthEndpoints();
    
    // Test all CRUD endpoints
    await testContactsEndpoints();
    await testExchangesEndpoints();
    await testTasksEndpoints();
    await testDocumentsEndpoints();
    await testMessagesEndpoints();
    await testNotificationsEndpoints();
    
    // Test admin endpoints
    await testAdminEndpoints();
    
    // Test enterprise endpoints
    await testEnterpriseEndpoints();
    
    // Test sync endpoints
    await testSyncEndpoints();
    await testSyncRoutesEndpoints();
    
    // Test export endpoints
    await testExportEndpoints();
    
    // Test OAuth endpoints
    await testOAuthEndpoints();
    
    // Test exchange participants endpoints
    await testExchangeParticipantsEndpoints();
    
    // Test templates endpoints
    await testTemplatesEndpoints();
    await testTemplatesEnhancedEndpoints();
    await testTemplateDocumentsEndpoints();
    
    // Test enhanced messages endpoints
    await testEnhancedMessagesEndpoints();
    
    // Test updated exchanges endpoints
    await testExchangesUpdatedEndpoints();
    
    // Test mock endpoints
    await testMockEndpoints();
    
    // Test Supabase-specific endpoints
    await testSupabaseAuthEndpoints();
    await testSupabaseExchangesEndpoints();
    
    // Test legacy auth endpoints
    await testLegacyAuthEndpoints();
    
    // Test practice partner endpoints
    await testPracticePartnerEndpoints();
    
    // Test files endpoints
    await testFilesEndpoints();
    
    // Test non-existent endpoints (should return 404)
    await testNonExistentEndpoints();
    
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
  runAllTests().then(() => {
    log.success('\n🎉 Test suite completed!');
    process.exit(0);
  }).catch(error => {
    log.error(`\n💥 Test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testResults
}; 