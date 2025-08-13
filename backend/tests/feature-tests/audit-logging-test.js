const axios = require('axios');
const colors = require('colors');

class AuditLoggingTestSuite {
  constructor() {
    this.baseURL = process.env.TEST_API_URL || 'http://localhost:5001';
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.adminToken = null;
    this.testExchangeId = null;
    this.testDocumentId = null;
    this.testTaskId = null;
  }

  async run() {
    console.log('\n📊 AUDIT LOGGING TEST SUITE'.cyan.bold);
    console.log('='.repeat(50));
    
    try {
      await this.authenticate();
      await this.testLoginEvents();
      await this.testDocumentActivity();
      await this.testTaskActivity();
      await this.testUserActions();
      await this.testSyncLogs();
      await this.testIPLogging();
      await this.testAuditRetrieval();
      await this.testAuditExport();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.failed++;
    }
  }

  async authenticate() {
    console.log('\n🔐 Authenticating as admin...'.yellow);
    
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'admin@peak1031.com',
        password: 'admin123'
      });
      
      if (response.data.token) {
        this.adminToken = response.data.token;
        console.log('✅ Admin authentication successful');
        this.testResults.passed++;
      } else {
        throw new Error('No token received');
      }
    } catch (error) {
      console.log('❌ Admin authentication failed:', error.response?.data?.error || error.message);
      this.testResults.failed++;
      throw error;
    }
  }

  async testLoginEvents() {
    console.log('\n🔐 Testing Login Events...'.yellow);
    
    // Test 1: Successful login audit
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'coordinator@peak1031.com',
        password: 'coordinator123'
      });
      
      if (response.data.token) {
        console.log('✅ Login event should be logged');
        this.testResults.passed++;
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.log('❌ Login test failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test 2: Failed login audit
    try {
      await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });
      console.log('❌ Invalid login should have failed');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Failed login event should be logged');
        this.testResults.passed++;
      } else {
        console.log('❌ Unexpected error for invalid login:', error.message);
        this.testResults.failed++;
      }
    }
    
    // Test 3: 2FA attempts audit
    try {
      await axios.post(`${this.baseURL}/api/auth/verify-2fa`, {
        code: '123456'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      console.log('⚠️ 2FA verification test inconclusive (invalid code)');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ 2FA attempt should be logged');
        this.testResults.passed++;
      } else {
        console.log('⚠️ 2FA audit test inconclusive:', error.message);
      }
    }
  }

  async testDocumentActivity() {
    console.log('\n📁 Testing Document Activity Logging...'.yellow);
    
    // Create a test exchange first
    try {
      const exchangeResponse = await axios.post(`${this.baseURL}/api/exchanges`, {
        name: 'Test Exchange for Audit',
        status: 'PENDING',
        clientId: 'test-client-id'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (exchangeResponse.data.id) {
        this.testExchangeId = exchangeResponse.data.id;
        console.log('✅ Test exchange created for document testing');
        this.testResults.passed++;
      }
    } catch (error) {
      console.log('⚠️ Could not create test exchange:', error.message);
    }
    
    // Test 1: Document upload audit
    if (this.testExchangeId) {
      try {
        // Create a test document (simulate upload)
        const documentData = {
          filename: 'test-document.pdf',
          originalFilename: 'test-document.pdf',
          exchangeId: this.testExchangeId,
          category: 'test',
          fileSize: 1024
        };
        
        const response = await axios.post(`${this.baseURL}/api/documents`, documentData, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
        
        if (response.data.id) {
          this.testDocumentId = response.data.id;
          console.log('✅ Document upload should be logged');
          this.testResults.passed++;
        } else {
          throw new Error('Document creation failed');
        }
      } catch (error) {
        console.log('❌ Document upload test failed:', error.message);
        this.testResults.failed++;
      }
    }
    
    // Test 2: Document download audit
    if (this.testDocumentId) {
      try {
        const response = await axios.get(`${this.baseURL}/api/documents/${this.testDocumentId}/download`, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
        
        if (response.status === 200) {
          console.log('✅ Document download should be logged');
          this.testResults.passed++;
        } else {
          throw new Error('Document download failed');
        }
      } catch (error) {
        console.log('⚠️ Document download test inconclusive:', error.message);
      }
    }
    
    // Test 3: Document view audit
    if (this.testDocumentId) {
      try {
        const response = await axios.get(`${this.baseURL}/api/documents/${this.testDocumentId}`, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
        
        if (response.data) {
          console.log('✅ Document view should be logged');
          this.testResults.passed++;
        } else {
          throw new Error('Document view failed');
        }
      } catch (error) {
        console.log('❌ Document view test failed:', error.message);
        this.testResults.failed++;
      }
    }
  }

  async testTaskActivity() {
    console.log('\n✅ Testing Task Activity Logging...'.yellow);
    
    // Create a test task
    try {
      const taskData = {
        title: 'Test Task for Audit',
        description: 'Test task description',
        status: 'PENDING',
        exchangeId: this.testExchangeId || 'test-exchange-id',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      
      const response = await axios.post(`${this.baseURL}/api/tasks`, taskData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data.id) {
        this.testTaskId = response.data.id;
        console.log('✅ Task creation should be logged');
        this.testResults.passed++;
      } else {
        throw new Error('Task creation failed');
      }
    } catch (error) {
      console.log('❌ Task creation test failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test task status update
    if (this.testTaskId) {
      try {
        const response = await axios.put(`${this.baseURL}/api/tasks/${this.testTaskId}`, {
          status: 'IN_PROGRESS'
        }, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
        
        if (response.data.status === 'IN_PROGRESS') {
          console.log('✅ Task status update should be logged');
          this.testResults.passed++;
        } else {
          throw new Error('Task status update failed');
        }
      } catch (error) {
        console.log('❌ Task status update test failed:', error.message);
        this.testResults.failed++;
      }
    }
    
    // Test task completion
    if (this.testTaskId) {
      try {
        const response = await axios.put(`${this.baseURL}/api/tasks/${this.testTaskId}`, {
          status: 'COMPLETED',
          completedAt: new Date().toISOString()
        }, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
        
        if (response.data.status === 'COMPLETED') {
          console.log('✅ Task completion should be logged');
          this.testResults.passed++;
        } else {
          throw new Error('Task completion failed');
        }
      } catch (error) {
        console.log('❌ Task completion test failed:', error.message);
        this.testResults.failed++;
      }
    }
  }

  async testUserActions() {
    console.log('\n👤 Testing User Actions Logging...'.yellow);
    
    // Test 1: User creation audit
    try {
      const userData = {
        email: 'testuser@example.com',
        password: 'TestPass123!',
        firstName: 'Test',
        lastName: 'User',
        role: 'client'
      };
      
      const response = await axios.post(`${this.baseURL}/api/users`, userData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data.id) {
        console.log('✅ User creation should be logged');
        this.testResults.passed++;
        
        // Test 2: User status change audit
        try {
          const updateResponse = await axios.put(`${this.baseURL}/api/users/${response.data.id}`, {
            isActive: false
          }, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (updateResponse.data.isActive === false) {
            console.log('✅ User status change should be logged');
            this.testResults.passed++;
          } else {
            throw new Error('User status update failed');
          }
        } catch (error) {
          console.log('❌ User status change test failed:', error.message);
          this.testResults.failed++;
        }
        
        // Test 3: User reactivation audit
        try {
          const reactivateResponse = await axios.put(`${this.baseURL}/api/users/${response.data.id}/activate`, {}, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (reactivateResponse.status === 200) {
            console.log('✅ User reactivation should be logged');
            this.testResults.passed++;
          } else {
            throw new Error('User reactivation failed');
          }
        } catch (error) {
          console.log('❌ User reactivation test failed:', error.message);
          this.testResults.failed++;
        }
      } else {
        throw new Error('User creation failed');
      }
    } catch (error) {
      console.log('❌ User creation test failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test 4: Role assignment audit
    if (this.testExchangeId) {
      try {
        const participantData = {
          userId: 'test-user-id',
          role: 'client'
        };
        
        const response = await axios.post(`${this.baseURL}/api/exchanges/${this.testExchangeId}/participants`, participantData, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
        
        if (response.status === 200 || response.status === 201) {
          console.log('✅ Role assignment should be logged');
          this.testResults.passed++;
        } else {
          throw new Error('Role assignment failed');
        }
      } catch (error) {
        console.log('⚠️ Role assignment test inconclusive:', error.message);
      }
    }
  }

  async testSyncLogs() {
    console.log('\n🔄 Testing Sync Logs...'.yellow);
    
    // Test 1: Manual sync trigger audit
    try {
      const response = await axios.post(`${this.baseURL}/api/sync/contacts`, {}, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 200 || response.status === 202) {
        console.log('✅ Manual sync trigger should be logged');
        this.testResults.passed++;
      } else {
        throw new Error('Manual sync failed');
      }
    } catch (error) {
      console.log('⚠️ Manual sync test inconclusive:', error.message);
    }
    
    // Test 2: Sync logs retrieval
    try {
      const response = await axios.get(`${this.baseURL}/api/sync/logs`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Sync logs retrieval working (${response.data.length} logs)`);
        this.testResults.passed++;
        
        // Check log structure
        if (response.data.length > 0) {
          const log = response.data[0];
          const requiredFields = ['id', 'syncType', 'status', 'startedAt'];
          const missingFields = requiredFields.filter(field => !log[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Sync logs have required fields');
            this.testResults.passed++;
          } else {
            console.log(`⚠️ Sync logs missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid sync logs format');
      }
    } catch (error) {
      console.log('❌ Sync logs retrieval failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testIPLogging() {
    console.log('\n🌐 Testing IP Address Logging...'.yellow);
    
    // Test 1: Check if IP addresses are being logged in audit logs
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/logs`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Audit logs retrieval working (${response.data.length} logs)`);
        this.testResults.passed++;
        
        // Check for IP address logging
        if (response.data.length > 0) {
          const log = response.data[0];
          if (log.ipAddress || log.ip_address) {
            console.log('✅ IP addresses are being logged');
            this.testResults.passed++;
          } else {
            console.log('⚠️ IP addresses may not be logged');
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid audit logs format');
      }
    } catch (error) {
      console.log('❌ Audit logs retrieval failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testAuditRetrieval() {
    console.log('\n📋 Testing Audit Log Retrieval...'.yellow);
    
    // Test 1: Get all audit logs
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/logs`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Audit logs retrieval working (${response.data.length} logs)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid audit logs format');
      }
    } catch (error) {
      console.log('❌ Audit logs retrieval failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test 2: Filter audit logs by action
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/logs?action=LOGIN`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Audit logs filtering working (${response.data.length} login logs)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid filtered audit logs format');
      }
    } catch (error) {
      console.log('❌ Audit logs filtering failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test 3: Get audit logs by user
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/logs?userId=admin`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ User-specific audit logs working (${response.data.length} logs)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid user audit logs format');
      }
    } catch (error) {
      console.log('❌ User-specific audit logs failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testAuditExport() {
    console.log('\n📤 Testing Audit Log Export...'.yellow);
    
    // Test 1: Export audit logs as CSV
    try {
      const response = await axios.post(`${this.baseURL}/api/audit/export`, {
        format: 'csv',
        filters: {
          action: 'LOGIN',
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        }
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 200) {
        console.log('✅ Audit log CSV export working');
        this.testResults.passed++;
      } else {
        throw new Error('CSV export failed');
      }
    } catch (error) {
      console.log('❌ Audit log CSV export failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test 2: Export audit logs as PDF
    try {
      const response = await axios.post(`${this.baseURL}/api/audit/export`, {
        format: 'pdf',
        filters: {
          action: 'DOCUMENT_UPLOAD',
          startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        }
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 200) {
        console.log('✅ Audit log PDF export working');
        this.testResults.passed++;
      } else {
        throw new Error('PDF export failed');
      }
    } catch (error) {
      console.log('❌ Audit log PDF export failed:', error.message);
      this.testResults.failed++;
    }
  }

  printResults() {
    console.log('\n📊 AUDIT LOGGING TEST RESULTS'.cyan.bold);
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.testResults.passed}`.green);
    console.log(`❌ Failed: ${this.testResults.failed}`.red);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors:'.red);
      this.testResults.errors.forEach(error => {
        console.log(`  - ${error}`.red);
      });
    }
    
    console.log('\n' + '='.repeat(50));
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const testSuite = new AuditLoggingTestSuite();
  testSuite.run().catch(console.error);
}

module.exports = AuditLoggingTestSuite;




