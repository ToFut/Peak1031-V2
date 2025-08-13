const axios = require('axios');
const colors = require('colors');

class ExchangeManagementTestSuite {
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
    console.log('\n🏢 CONTRACT A.3.2: EXCHANGE MANAGEMENT TEST SUITE'.cyan.bold);
    console.log('='.repeat(70));
    
    try {
      await this.authenticate();
      await this.testPracticePantherMattersAsExchanges();
      await this.testExchangeDetails();
      await this.testStatusTracking();
      await this.testFilterSearch();
      await this.testUserAssignment();
      await this.testExchangeCRUD();
      
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

  async testPracticePantherMattersAsExchanges() {
    console.log('\n🔄 Testing Display PracticePanther "matters" as exchanges...'.yellow);
    
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && response.data.exchanges && Array.isArray(response.data.exchanges)) {
        console.log(`✅ PracticePanther matters displayed as exchanges (${response.data.exchanges.length} exchanges)`);
        this.testResults.passed++;
        
        // Check for PP matter ID field
        if (response.data.exchanges.length > 0) {
          const exchange = response.data.exchanges[0];
          this.exchangeId = exchange.id;
          
          if (exchange.ppMatterId || exchange.pp_matter_id) {
            console.log('✅ Exchange has PracticePanther matter ID');
            this.testResults.passed++;
          } else {
            console.log('⚠️ Exchange missing PracticePanther matter ID');
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid exchange data format');
      }
    } catch (error) {
      console.log('❌ PracticePanther matters as exchanges failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testExchangeDetails() {
    console.log('\n📋 Testing Exchange details: status, key dates, assigned users...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for details test');
      return;
    }
    
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges/${this.exchangeId}`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && response.data.exchange) {
        const exchange = response.data.exchange;
        console.log('✅ Exchange details endpoint working');
        this.testResults.passed++;
        
        // Check for required fields
        const requiredFields = ['id', 'name', 'status'];
        const missingFields = requiredFields.filter(field => !exchange[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ Exchange has all required fields');
          this.testResults.passed++;
        } else {
          console.log(`❌ Exchange missing fields: ${missingFields.join(', ')}`);
          this.testResults.failed++;
        }
        
        // Check for key dates
        if (exchange.startDate || exchange.completionDate || exchange.start_date || exchange.completion_date) {
          console.log('✅ Exchange has key dates');
          this.testResults.passed++;
        } else {
          console.log('⚠️ Exchange missing key dates');
          this.testResults.failed++;
        }
        
        // Check for assigned users
        if (exchange.participants || exchange.assignedUsers) {
          console.log('✅ Exchange has assigned users');
          this.testResults.passed++;
        } else {
          console.log('⚠️ Exchange missing assigned users');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid exchange details format');
      }
    } catch (error) {
      console.log('❌ Exchange details failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testStatusTracking() {
    console.log('\n📊 Testing Status tracking: PENDING, 45D, 180D, COMPLETED...'.yellow);
    
    const validStatuses = ['PENDING', '45D', '180D', 'COMPLETED'];
    
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && response.data.exchanges && Array.isArray(response.data.exchanges)) {
        let validStatusCount = 0;
        let invalidStatusCount = 0;
        
        for (const exchange of response.data.exchanges) {
          if (exchange.status && validStatuses.includes(exchange.status)) {
            validStatusCount++;
          } else {
            invalidStatusCount++;
          }
        }
        
        if (invalidStatusCount === 0) {
          console.log(`✅ All ${validStatusCount} exchanges have valid status`);
          this.testResults.passed++;
        } else {
          console.log(`⚠️ ${invalidStatusCount} exchanges have invalid status`);
          this.testResults.failed++;
        }
        
        // Test status update
        if (this.exchangeId) {
          try {
            const updateResponse = await axios.put(`${this.baseURL}/api/exchanges/${this.exchangeId}`, {
              status: '45D'
            }, {
              headers: { Authorization: `Bearer ${this.adminToken}` }
            });
            
            if (updateResponse.status === 200) {
              console.log('✅ Exchange status update working');
              this.testResults.passed++;
            } else {
              throw new Error(`Unexpected status: ${updateResponse.status}`);
            }
          } catch (error) {
            console.log('❌ Exchange status update failed:', error.message);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid exchange data format');
      }
    } catch (error) {
      console.log('❌ Status tracking failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testFilterSearch() {
    console.log('\n🔍 Testing Filter/search by user, stage, or property...'.yellow);
    
    const testFilters = [
      { status: 'PENDING', name: 'Status Filter' },
      { search: 'test', name: 'Search Filter' },
      { page: 1, limit: 10, name: 'Pagination' }
    ];
    
    for (const filter of testFilters) {
      try {
        const params = new URLSearchParams(filter);
        const response = await axios.get(`${this.baseURL}/api/exchanges?${params}`, {
          headers: { Authorization: `Bearer ${this.adminToken}` }
        });
        
        if (response.data && response.data.exchanges) {
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
      const response = await axios.get(`${this.baseURL}/api/exchanges?status=PENDING&sortBy=created_at&sortOrder=DESC`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && response.data.exchanges) {
        console.log('✅ Advanced filtering working');
        this.testResults.passed++;
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.log('❌ Advanced filtering failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testUserAssignment() {
    console.log('\n👥 Testing Assign users to specific exchanges (Admin + Client Approval)...'.yellow);
    
    if (!this.exchangeId) {
      console.log('⚠️ No exchange ID available for user assignment test');
      return;
    }
    
    // Test adding participant to exchange
    try {
      const response = await axios.post(`${this.baseURL}/api/exchanges/${this.exchangeId}/participants`, {
        userId: 'test-user-id',
        role: 'client'
      }, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 200 || response.status === 201) {
        console.log('✅ User assignment to exchange working');
        this.testResults.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ User assignment properly validates input');
        this.testResults.passed++;
      } else {
        console.log('❌ User assignment failed:', error.message);
        this.testResults.failed++;
      }
    }
    
    // Test getting exchange participants
    try {
      const response = await axios.get(`${this.baseURL}/api/exchanges/${this.exchangeId}/participants`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Exchange participants endpoint working (${response.data.length} participants)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid participants data format');
      }
    } catch (error) {
      console.log('❌ Exchange participants failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testExchangeCRUD() {
    console.log('\n🔄 Testing Exchange CRUD operations...'.yellow);
    
    // Test creating new exchange
    try {
      const newExchange = {
        name: 'Test Exchange',
        status: 'PENDING',
        description: 'Test exchange for contract validation'
      };
      
      const response = await axios.post(`${this.baseURL}/api/exchanges`, newExchange, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 201 && response.data.exchange) {
        console.log('✅ Exchange creation working');
        this.testResults.passed++;
        
        const createdExchangeId = response.data.exchange.id;
        
        // Test updating exchange
        try {
          const updateResponse = await axios.put(`${this.baseURL}/api/exchanges/${createdExchangeId}`, {
            name: 'Updated Test Exchange'
          }, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (updateResponse.status === 200) {
            console.log('✅ Exchange update working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${updateResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Exchange update failed:', error.message);
          this.testResults.failed++;
        }
        
        // Test deleting exchange
        try {
          const deleteResponse = await axios.delete(`${this.baseURL}/api/exchanges/${createdExchangeId}`, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (deleteResponse.status === 200) {
            console.log('✅ Exchange deletion working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${deleteResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Exchange deletion failed:', error.message);
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid creation response');
      }
    } catch (error) {
      console.log('❌ Exchange creation failed:', error.message);
      this.testResults.failed++;
    }
  }

  printResults() {
    console.log('\n📊 EXCHANGE MANAGEMENT TEST RESULTS'.cyan.bold);
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
  const testSuite = new ExchangeManagementTestSuite();
  testSuite.run().catch(console.error);
}

module.exports = ExchangeManagementTestSuite;



