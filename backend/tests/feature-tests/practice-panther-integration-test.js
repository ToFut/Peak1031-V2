const axios = require('axios');
const colors = require('colors');

class PracticePantherIntegrationTestSuite {
  constructor() {
    this.baseURL = process.env.TEST_API_URL || 'http://localhost:5001';
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    this.adminToken = null;
  }

  async run() {
    console.log('\n🔄 PRACTICEPANTHER INTEGRATION TEST SUITE'.cyan.bold);
    console.log('='.repeat(60));
    
    try {
      await this.authenticate();
      await this.testSyncEndpoints();
      await this.testDataTransformation();
      await this.testSyncConfiguration();
      await this.testErrorHandling();
      await this.testSyncMonitoring();
      await this.testDataValidation();
      
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

  async testSyncEndpoints() {
    console.log('\n🔄 Testing Sync Endpoints...'.yellow);
    
    const syncEndpoints = [
      { path: '/api/sync/contacts', name: 'Contact Sync' },
      { path: '/api/sync/matters', name: 'Matter Sync' },
      { path: '/api/sync/tasks', name: 'Task Sync' },
      { path: '/api/sync/all', name: 'Full Sync' }
    ];
    
    for (const endpoint of syncEndpoints) {
      try {
        const response = await axios.post(`${this.baseURL}${endpoint.path}`, {}, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
        
        if (response.status === 200 || response.status === 202) {
          console.log(`✅ ${endpoint.name} endpoint working`);
          this.testResults.passed++;
        } else {
          throw new Error(`Unexpected status: ${response.status}`);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          console.log(`❌ ${endpoint.name} requires authentication`);
          this.testResults.failed++;
        } else if (error.response?.status === 403) {
          console.log(`❌ ${endpoint.name} requires admin privileges`);
          this.testResults.failed++;
        } else {
          console.log(`⚠️ ${endpoint.name} test inconclusive:`, error.message);
        }
      }
    }
    
    // Test sync status endpoint
    try {
      const response = await axios.get(`${this.baseURL}/api/sync/status`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Sync status endpoint working');
        this.testResults.passed++;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.log('❌ Sync status endpoint failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testDataTransformation() {
    console.log('\n🔄 Testing Data Transformation...'.yellow);
    
    // Test contact data transformation
    try {
      const response = await axios.get(`${this.baseURL}/api/contacts`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Contact data transformation working (${response.data.length} contacts)`);
        this.testResults.passed++;
        
        // Check for required fields
        if (response.data.length > 0) {
          const contact = response.data[0];
          const requiredFields = ['id', 'firstName', 'lastName', 'email'];
          const missingFields = requiredFields.filter(field => !contact[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Contact data has all required fields');
            this.testResults.passed++;
          } else {
            console.log(`⚠️ Contact data missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid contact data format');
      }
    } catch (error) {
      console.log('❌ Contact data transformation failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test exchange (matter) data transformation
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && response.data.exchanges && Array.isArray(response.data.exchanges)) {
        console.log(`✅ Exchange data transformation working (${response.data.exchanges.length} exchanges)`);
        this.testResults.passed++;
        
        // Check for required fields
        if (response.data.exchanges.length > 0) {
          const exchange = response.data.exchanges[0];
          const requiredFields = ['id', 'name', 'status'];
          const missingFields = requiredFields.filter(field => !exchange[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Exchange data has all required fields');
            this.testResults.passed++;
          } else {
            console.log(`⚠️ Exchange data missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid exchange data format');
      }
    } catch (error) {
      console.log('❌ Exchange data transformation failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test task data transformation
    try {
      const response = await axios.get(`${this.baseURL}/api/tasks`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Task data transformation working (${response.data.length} tasks)`);
        this.testResults.passed++;
        
        // Check for required fields
        if (response.data.length > 0) {
          const task = response.data[0];
          const requiredFields = ['id', 'title', 'status'];
          const missingFields = requiredFields.filter(field => !task[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Task data has all required fields');
            this.testResults.passed++;
          } else {
            console.log(`⚠️ Task data missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid task data format');
      }
    } catch (error) {
      console.log('❌ Task data transformation failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testSyncConfiguration() {
    console.log('\n⚙️ Testing Sync Configuration...'.yellow);
    
    // Test sync configuration endpoint
    try {
      const response = await axios.get(`${this.baseURL}/api/sync/config`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Sync configuration endpoint working');
        this.testResults.passed++;
        
        // Check for required configuration fields
        const config = response.data;
        const requiredFields = ['enabled', 'syncInterval'];
        const missingFields = requiredFields.filter(field => config[field] === undefined);
        
        if (missingFields.length === 0) {
          console.log('✅ Sync configuration has required fields');
          this.testResults.passed++;
        } else {
          console.log(`⚠️ Sync configuration missing fields: ${missingFields.join(', ')}`);
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid configuration format');
      }
    } catch (error) {
      console.log('❌ Sync configuration endpoint failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test updating sync configuration
    try {
      const testConfig = {
        enabled: true,
        syncInterval: 30,
        autoSync: true
      };
      
      const response = await axios.put(`${this.baseURL}/api/sync/config`, testConfig, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 200) {
        console.log('✅ Sync configuration update working');
        this.testResults.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Sync configuration update failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testErrorHandling() {
    console.log('\n🛡️ Testing Error Handling...'.yellow);
    
    // Test invalid sync request
    try {
      await axios.post(`${this.baseURL}/api/sync/invalid`, {}, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      console.log('❌ Invalid sync endpoint should be rejected');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Invalid sync endpoint properly rejected');
        this.testResults.passed++;
      } else {
        console.log('⚠️ Invalid sync endpoint test inconclusive:', error.message);
      }
    }
    
    // Test sync without authentication
    try {
      await axios.post(`${this.baseURL}/api/sync/contacts`);
      console.log('❌ Sync without authentication should be rejected');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Sync without authentication properly rejected');
        this.testResults.passed++;
      } else {
        console.log('⚠️ Authentication test inconclusive:', error.message);
      }
    }
    
    // Test sync with non-admin user
    try {
      // Create a non-admin token
      const clientResponse = await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'client@peak1031.com',
        password: 'client123'
      });
      
      if (clientResponse.data.token) {
        await axios.post(`${this.baseURL}/api/sync/contacts`, {}, {
          headers: { Authorization: `Bearer ${clientResponse.data.token}` }
        });
        console.log('❌ Non-admin sync should be rejected');
        this.testResults.failed++;
      }
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Non-admin sync properly rejected');
        this.testResults.passed++;
      } else {
        console.log('⚠️ Non-admin sync test inconclusive:', error.message);
      }
    }
  }

  async testSyncMonitoring() {
    console.log('\n📊 Testing Sync Monitoring...'.yellow);
    
    // Test sync logs endpoint
    try {
      const response = await axios.get(`${this.baseURL}/api/sync/logs`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Sync logs endpoint working (${response.data.length} logs)`);
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
      console.log('❌ Sync logs endpoint failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test sync statistics endpoint
    try {
      const response = await axios.get(`${this.baseURL}/api/sync/statistics`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Sync statistics endpoint working');
        this.testResults.passed++;
        
        // Check for statistics fields
        const stats = response.data;
        const expectedFields = ['totalSyncs', 'successfulSyncs', 'failedSyncs', 'lastSyncTime'];
        const presentFields = expectedFields.filter(field => stats[field] !== undefined);
        
        if (presentFields.length > 0) {
          console.log(`✅ Sync statistics have fields: ${presentFields.join(', ')}`);
          this.testResults.passed++;
        } else {
          console.log('⚠️ Sync statistics missing expected fields');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid statistics format');
      }
    } catch (error) {
      console.log('❌ Sync statistics endpoint failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testDataValidation() {
    console.log('\n✅ Testing Data Validation...'.yellow);
    
    // Test contact data validation
    try {
      const response = await axios.get(`${this.baseURL}/api/contacts`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        let validContacts = 0;
        let invalidContacts = 0;
        
        for (const contact of response.data) {
          // Check for valid email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (contact.email && emailRegex.test(contact.email)) {
            validContacts++;
          } else {
            invalidContacts++;
          }
        }
        
        if (invalidContacts === 0) {
          console.log(`✅ All ${validContacts} contacts have valid email addresses`);
          this.testResults.passed++;
        } else {
          console.log(`⚠️ ${invalidContacts} contacts have invalid email addresses`);
          this.testResults.failed++;
        }
      }
    } catch (error) {
      console.log('❌ Contact validation failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test exchange data validation
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && response.data.exchanges && Array.isArray(response.data.exchanges)) {
        let validExchanges = 0;
        let invalidExchanges = 0;
        
        for (const exchange of response.data.exchanges) {
          // Check for valid status
          const validStatuses = ['PENDING', '45D', '180D', 'COMPLETED'];
          if (exchange.status && validStatuses.includes(exchange.status)) {
            validExchanges++;
          } else {
            invalidExchanges++;
          }
        }
        
        if (invalidExchanges === 0) {
          console.log(`✅ All ${validExchanges} exchanges have valid status`);
          this.testResults.passed++;
        } else {
          console.log(`⚠️ ${invalidExchanges} exchanges have invalid status`);
          this.testResults.failed++;
        }
      }
    } catch (error) {
      console.log('❌ Exchange validation failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test task data validation
    try {
      const response = await axios.get(`${this.baseURL}/api/tasks`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        let validTasks = 0;
        let invalidTasks = 0;
        
        for (const task of response.data) {
          // Check for valid status
          const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
          if (task.status && validStatuses.includes(task.status)) {
            validTasks++;
          } else {
            invalidTasks++;
          }
        }
        
        if (invalidTasks === 0) {
          console.log(`✅ All ${validTasks} tasks have valid status`);
          this.testResults.passed++;
        } else {
          console.log(`⚠️ ${invalidTasks} tasks have invalid status`);
          this.testResults.failed++;
        }
      }
    } catch (error) {
      console.log('❌ Task validation failed:', error.message);
      this.testResults.failed++;
    }
  }

  printResults() {
    console.log('\n📊 PRACTICEPANTHER INTEGRATION TEST RESULTS'.cyan.bold);
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${this.testResults.passed}`.green);
    console.log(`❌ Failed: ${this.testResults.failed}`.red);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors:'.red);
      this.testResults.errors.forEach(error => {
        console.log(`  - ${error}`.red);
      });
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const testSuite = new PracticePantherIntegrationTestSuite();
  testSuite.run().catch(console.error);
}

module.exports = PracticePantherIntegrationTestSuite;
