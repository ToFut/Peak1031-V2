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
    console.log('\n🔄 CONTRACT A.3.6: PRACTICEPANTHER INTEGRATION TEST SUITE'.cyan.bold);
    console.log('='.repeat(70));
    
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
    console.log('\n🔄 Testing One-way sync: Clients, Matters, Contacts (GET no POST)...'.yellow);
    
    // Test clients sync
    try {
      const response = await axios.get(`${this.baseURL}/api/practice-panther/clients`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ PracticePanther clients sync working (${response.data.length} clients)`);
        this.testResults.passed++;
        
        // Check client structure
        if (response.data.length > 0) {
          const client = response.data[0];
          const requiredFields = ['id', 'name'];
          const missingFields = requiredFields.filter(field => !client[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Client data structure correct');
            this.testResults.passed++;
          } else {
            console.log(`❌ Client missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid clients data format');
      }
    } catch (error) {
      console.log('❌ PracticePanther clients sync failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test matters sync
    try {
      const response = await axios.get(`${this.baseURL}/api/practice-panther/matters`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ PracticePanther matters sync working (${response.data.length} matters)`);
        this.testResults.passed++;
        
        // Check matter structure
        if (response.data.length > 0) {
          const matter = response.data[0];
          const requiredFields = ['id', 'name', 'clientId'];
          const missingFields = requiredFields.filter(field => !matter[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Matter data structure correct');
            this.testResults.passed++;
          } else {
            console.log(`❌ Matter missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid matters data format');
      }
    } catch (error) {
      console.log('❌ PracticePanther matters sync failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test contacts sync
    try {
      const response = await axios.get(`${this.baseURL}/api/practice-panther/contacts`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ PracticePanther contacts sync working (${response.data.length} contacts)`);
        this.testResults.passed++;
        
        // Check contact structure
        if (response.data.length > 0) {
          const contact = response.data[0];
          const requiredFields = ['id', 'name', 'email'];
          const missingFields = requiredFields.filter(field => !contact[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Contact data structure correct');
            this.testResults.passed++;
          } else {
            console.log(`❌ Contact missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid contacts data format');
      }
    } catch (error) {
      console.log('❌ PracticePanther contacts sync failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testDataTransformation() {
    console.log('\n🔄 Testing Data transformation and mapping...'.yellow);
    
    // Test data transformation for clients
    try {
      const response = await axios.get(`${this.baseURL}/api/practice-panther/clients/transformed`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ Client data transformation working');
        this.testResults.passed++;
        
        // Check for transformed fields
        if (response.data.length > 0) {
          const client = response.data[0];
          const transformedFields = ['exchangeId', 'participants', 'status'];
          const hasTransformedFields = transformedFields.some(field => client[field] !== undefined);
          
          if (hasTransformedFields) {
            console.log('✅ Client data properly transformed');
            this.testResults.passed++;
          } else {
            console.log('❌ Client data transformation incomplete');
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid transformed data format');
      }
    } catch (error) {
      console.log('❌ Client data transformation failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test data transformation for matters
    try {
      const response = await axios.get(`${this.baseURL}/api/practice-panther/matters/transformed`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ Matter data transformation working');
        this.testResults.passed++;
        
        // Check for transformed fields
        if (response.data.length > 0) {
          const matter = response.data[0];
          const transformedFields = ['exchangeId', 'participants', 'documents'];
          const hasTransformedFields = transformedFields.some(field => matter[field] !== undefined);
          
          if (hasTransformedFields) {
            console.log('✅ Matter data properly transformed');
            this.testResults.passed++;
          } else {
            console.log('❌ Matter data transformation incomplete');
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid transformed data format');
      }
    } catch (error) {
      console.log('❌ Matter data transformation failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testSyncConfiguration() {
    console.log('\n⚙️ Testing Configurable sync frequency (hourly or daily)...'.yellow);
    
    // Test sync configuration
    try {
      const response = await axios.get(`${this.baseURL}/api/practice-panther/config`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ PracticePanther sync configuration endpoint working');
        this.testResults.passed++;
        
        // Check for sync frequency settings
        if (response.data.syncFrequency || response.data.sync_frequency) {
          console.log('✅ Sync frequency configuration present');
          this.testResults.passed++;
        } else {
          console.log('❌ Sync frequency configuration missing');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid configuration format');
      }
    } catch (error) {
      console.log('❌ PracticePanther sync configuration failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test updating sync configuration
    try {
      const configData = {
        syncFrequency: 'hourly',
        autoSync: true,
        lastSync: new Date().toISOString()
      };
      
      const response = await axios.put(`${this.baseURL}/api/practice-panther/config`, configData, {
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
    console.log('\n⚠️ Testing Error handling and retry logic...'.yellow);
    
    // Test invalid API credentials
    try {
      await axios.get(`${this.baseURL}/api/practice-panther/clients`, {
        headers: { 
          Authorization: `Bearer ${this.adminToken}`,
          'X-PP-Test-Error': 'invalid_credentials'
        }
      });
      
      console.log('❌ Should have handled invalid credentials error');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 500) {
        console.log('✅ Invalid credentials properly handled');
        this.testResults.passed++;
      } else {
        console.log('❌ Unexpected error handling:', error.message);
        this.testResults.failed++;
      }
    }
    
    // Test network timeout
    try {
      await axios.get(`${this.baseURL}/api/practice-panther/clients`, {
        headers: { 
          Authorization: `Bearer ${this.adminToken}`,
          'X-PP-Test-Error': 'timeout'
        },
        timeout: 1000
      });
      
      console.log('❌ Should have handled timeout error');
      this.testResults.failed++;
    } catch (error) {
      if (error.code === 'ECONNABORTED' || error.response?.status === 408) {
        console.log('✅ Timeout properly handled');
        this.testResults.passed++;
      } else {
        console.log('❌ Unexpected timeout handling:', error.message);
        this.testResults.failed++;
      }
    }
    
    // Test rate limiting
    try {
      await axios.get(`${this.baseURL}/api/practice-panther/clients`, {
        headers: { 
          Authorization: `Bearer ${this.adminToken}`,
          'X-PP-Test-Error': 'rate_limit'
        }
      });
      
      console.log('❌ Should have handled rate limit error');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('✅ Rate limiting properly handled');
        this.testResults.passed++;
      } else {
        console.log('❌ Unexpected rate limit handling:', error.message);
        this.testResults.failed++;
      }
    }
  }

  async testSyncMonitoring() {
    console.log('\n📊 Testing Sync monitoring and status...'.yellow);
    
    // Test sync status endpoint
    try {
      const response = await axios.get(`${this.baseURL}/api/practice-panther/status`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ PracticePanther sync status endpoint working');
        this.testResults.passed++;
        
        // Check for status fields
        const statusFields = ['lastSync', 'nextSync', 'status', 'errorCount'];
        const hasStatusFields = statusFields.some(field => response.data[field] !== undefined);
        
        if (hasStatusFields) {
          console.log('✅ Sync status information present');
          this.testResults.passed++;
        } else {
          console.log('❌ Sync status information incomplete');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid status format');
      }
    } catch (error) {
      console.log('❌ PracticePanther sync status failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test sync logs
    try {
      const response = await axios.get(`${this.baseURL}/api/practice-panther/logs`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ PracticePanther sync logs working (${response.data.length} logs)`);
        this.testResults.passed++;
        
        // Check log structure
        if (response.data.length > 0) {
          const log = response.data[0];
          const requiredFields = ['id', 'timestamp', 'action', 'status'];
          const missingFields = requiredFields.filter(field => !log[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Sync logs have required fields');
            this.testResults.passed++;
          } else {
            console.log(`❌ Sync logs missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid logs format');
      }
    } catch (error) {
      console.log('❌ PracticePanther sync logs failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testDataValidation() {
    console.log('\n✅ Testing Data validation and integrity...'.yellow);
    
    // Test data validation for clients
    try {
      const response = await axios.get(`${this.baseURL}/api/practice-panther/clients/validate`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Client data validation working');
        this.testResults.passed++;
        
        // Check validation results
        if (response.data.isValid !== undefined) {
          console.log('✅ Data validation results present');
          this.testResults.passed++;
        } else {
          console.log('❌ Data validation results missing');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid validation format');
      }
    } catch (error) {
      console.log('❌ Client data validation failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test data integrity check
    try {
      const response = await axios.get(`${this.baseURL}/api/practice-panther/integrity`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Data integrity check working');
        this.testResults.passed++;
        
        // Check integrity results
        if (response.data.checksum || response.data.lastModified) {
          console.log('✅ Data integrity information present');
          this.testResults.passed++;
        } else {
          console.log('❌ Data integrity information incomplete');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid integrity format');
      }
    } catch (error) {
      console.log('❌ Data integrity check failed:', error.message);
      this.testResults.failed++;
    }
  }

  printResults() {
    console.log('\n📊 PRACTICEPANTHER INTEGRATION TEST RESULTS'.cyan.bold);
    console.log('='.repeat(70));
    console.log(`✅ Passed: ${this.testResults.passed}`.green);
    console.log(`❌ Failed: ${this.testResults.failed}`.red);
    console.log(`📈 Success Rate: ${((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100).toFixed(1)}%`);
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ Errors:'.red);
      this.testResults.errors.forEach(error => {
        console.log(`  - ${error}`.red);
      });
    }
    
    console.log('\n' + '='.repeat(70));
  }
}

// Run the test suite if this file is executed directly
if (require.main === module) {
  const testSuite = new PracticePantherIntegrationTestSuite();
  testSuite.run().catch(console.error);
}

module.exports = PracticePantherIntegrationTestSuite;



