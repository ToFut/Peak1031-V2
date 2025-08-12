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
    this.exchangeId = null;
  }

  async run() {
    console.log('\n📊 CONTRACT A.3.7: AUDIT LOGGING TEST SUITE'.cyan.bold);
    console.log('='.repeat(70));
    
    try {
      await this.authenticate();
      await this.testComprehensiveLogging();
      await this.testLogFiltering();
      await this.testExportCapabilities();
      await this.testLogRetention();
      await this.testLogSearch();
      await this.testLogStatistics();
      
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
      
      // Get an exchange for testing
      await this.getTestExchange();
      
    } catch (error) {
      console.log('❌ Admin authentication failed:', error.response?.data?.error || error.message);
      this.testResults.failed++;
      throw error;
    }
  }

  async getTestExchange() {
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && response.data.exchanges && response.data.exchanges.length > 0) {
        this.exchangeId = response.data.exchanges[0].id;
        console.log(`✅ Using exchange ${this.exchangeId} for testing`);
        this.testResults.passed++;
      } else {
        throw new Error('No exchanges available for testing');
      }
    } catch (error) {
      console.log('❌ Failed to get test exchange:', error.message);
      this.testResults.failed++;
    }
  }

  async testComprehensiveLogging() {
    console.log('\n📝 Testing Comprehensive logging of all user actions...'.yellow);
    
    // Test audit log creation
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/logs`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Audit logging working (${response.data.length} logs)`);
        this.testResults.passed++;
        
        // Check log structure
        if (response.data.length > 0) {
          const log = response.data[0];
          const requiredFields = ['id', 'action', 'entityType', 'entityId', 'userId', 'timestamp'];
          const missingFields = requiredFields.filter(field => !log[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ Audit logs have all required fields');
            this.testResults.passed++;
          } else {
            console.log(`❌ Audit logs missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
          
          // Check for different action types
          const actionTypes = response.data.map(log => log.action);
          const uniqueActions = [...new Set(actionTypes)];
          console.log(`✅ Found ${uniqueActions.length} different action types: ${uniqueActions.join(', ')}`);
          this.testResults.passed++;
        }
      } else {
        throw new Error('Invalid audit log format');
      }
    } catch (error) {
      console.log('❌ Comprehensive logging failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test creating a new log entry
    try {
      const logData = {
        action: 'test_action',
        entityType: 'test_entity',
        entityId: 'test_id',
        details: {
          testField: 'testValue',
          timestamp: new Date().toISOString()
        }
      };
      
      const response = await axios.post(`${this.baseURL}/api/audit/logs`, logData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 201) {
        console.log('✅ Audit log creation working');
        this.testResults.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Audit log creation failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testLogFiltering() {
    console.log('\n🔍 Testing Filter logs by user, action, date range, entity...'.yellow);
    
    const testFilters = [
      { userId: 'test-user', name: 'User Filter' },
      { action: 'login', name: 'Action Filter' },
      { entityType: 'exchange', name: 'Entity Type Filter' },
      { startDate: '2024-01-01', endDate: '2024-12-31', name: 'Date Range Filter' },
      { page: 1, limit: 10, name: 'Pagination' }
    ];
    
    for (const filter of testFilters) {
      try {
        const params = new URLSearchParams(filter);
        const response = await axios.get(`${this.baseURL}/api/audit/logs?${params}`, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
        
        if (response.data && Array.isArray(response.data)) {
          console.log(`✅ ${filter.name} working`);
          this.testResults.passed++;
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.log(`❌ ${filter.name} failed:`, error.message);
        this.testResults.failed++;
      }
    }
    
    // Test advanced filtering
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/logs?action=login&entityType=user&startDate=2024-01-01&endDate=2024-12-31&sortBy=timestamp&sortOrder=DESC`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log('✅ Advanced audit log filtering working');
        this.testResults.passed++;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.log('❌ Advanced audit log filtering failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testExportCapabilities() {
    console.log('\n📤 Testing Export capabilities: CSV, PDF...'.yellow);
    
    const exportFormats = ['csv', 'pdf'];
    
    for (const format of exportFormats) {
      try {
        const exportData = {
          format: format,
          filters: {
            startDate: '2024-01-01',
            endDate: '2024-12-31'
          }
        };
        
        const response = await axios.post(`${this.baseURL}/api/audit/export`, exportData, {
          headers: { Authorization: `Bearer ${this.adminToken}` },
          responseType: 'blob'
        });
        
        if (response.status === 200 && response.data) {
          console.log(`✅ ${format.toUpperCase()} export working`);
          this.testResults.passed++;
        } else {
          throw new Error(`Unexpected status: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${format.toUpperCase()} export failed:`, error.message);
        this.testResults.failed++;
      }
    }
    
    // Test export with custom filters
    try {
      const exportData = {
        format: 'csv',
        filters: {
          action: 'login',
          entityType: 'user',
          userId: 'test-user'
        }
      };
      
      const response = await axios.post(`${this.baseURL}/api/audit/export`, exportData, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        responseType: 'blob'
      });
      
      if (response.status === 200) {
        console.log('✅ Custom filter export working');
        this.testResults.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Custom filter export failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testLogRetention() {
    console.log('\n🗄️ Testing Log retention policies...'.yellow);
    
    // Test retention policy configuration
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/retention`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Log retention policy endpoint working');
        this.testResults.passed++;
        
        // Check retention settings
        if (response.data.retentionDays || response.data.retention_days) {
          console.log('✅ Retention policy configuration present');
          this.testResults.passed++;
        } else {
          console.log('❌ Retention policy configuration missing');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid retention format');
      }
    } catch (error) {
      console.log('❌ Log retention policy failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test updating retention policy
    try {
      const retentionData = {
        retentionDays: 365,
        archiveAfterDays: 90,
        deleteAfterDays: 730
      };
      
      const response = await axios.put(`${this.baseURL}/api/audit/retention`, retentionData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 200) {
        console.log('✅ Retention policy update working');
        this.testResults.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Retention policy update failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testLogSearch() {
    console.log('\n🔎 Testing Full-text search across log content...'.yellow);
    
    // Test basic search
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/search?q=login`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Basic search working (${response.data.length} results)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid search response format');
      }
    } catch (error) {
      console.log('❌ Basic search failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test advanced search
    try {
      const searchData = {
        query: 'login user',
        fields: ['action', 'details'],
        filters: {
          startDate: '2024-01-01',
          endDate: '2024-12-31'
        }
      };
      
      const response = await axios.post(`${this.baseURL}/api/audit/search`, searchData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Advanced search working (${response.data.length} results)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid advanced search response format');
      }
    } catch (error) {
      console.log('❌ Advanced search failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test search suggestions
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/search/suggestions?q=log`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Search suggestions working (${response.data.length} suggestions)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid suggestions response format');
      }
    } catch (error) {
      console.log('❌ Search suggestions failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testLogStatistics() {
    console.log('\n📈 Testing Log statistics and analytics...'.yellow);
    
    // Test basic statistics
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/stats`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Basic audit statistics working');
        this.testResults.passed++;
        
        // Check for common stat fields
        const statFields = ['totalLogs', 'todayLogs', 'uniqueUsers', 'topActions'];
        const hasStatFields = statFields.some(field => response.data[field] !== undefined);
        
        if (hasStatFields) {
          console.log('✅ Audit statistics data present');
          this.testResults.passed++;
        } else {
          console.log('❌ Audit statistics data incomplete');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid statistics format');
      }
    } catch (error) {
      console.log('❌ Basic audit statistics failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test time-based statistics
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/stats/timeline?period=7d`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Time-based statistics working (${response.data.length} data points)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid timeline format');
      }
    } catch (error) {
      console.log('❌ Time-based statistics failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test user activity statistics
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/stats/users`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ User activity statistics working (${response.data.length} users)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid user stats format');
      }
    } catch (error) {
      console.log('❌ User activity statistics failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test action type statistics
    try {
      const response = await axios.get(`${this.baseURL}/api/audit/stats/actions`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Action type statistics working (${response.data.length} action types)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid action stats format');
      }
    } catch (error) {
      console.log('❌ Action type statistics failed:', error.message);
      this.testResults.failed++;
    }
  }

  printResults() {
    console.log('\n📊 AUDIT LOGGING TEST RESULTS'.cyan.bold);
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
  const testSuite = new AuditLoggingTestSuite();
  testSuite.run().catch(console.error);
}

module.exports = AuditLoggingTestSuite;


