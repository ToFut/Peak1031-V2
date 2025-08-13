const axios = require('axios');
const colors = require('colors');

class AdminDashboardTestSuite {
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
    console.log('\n🏛️ CONTRACT A.3.8: ADMIN DASHBOARD TEST SUITE'.cyan.bold);
    console.log('='.repeat(70));
    
    try {
      await this.authenticate();
      await this.testDashboardOverview();
      await this.testUserManagement();
      await this.testSystemAnalytics();
      await this.testSystemConfiguration();
      await this.testAdminReports();
      await this.testSystemHealth();
      
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

  async testDashboardOverview() {
    console.log('\n📊 Testing Comprehensive admin dashboard overview...'.yellow);
    
    // Test dashboard data
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Admin dashboard endpoint working');
        this.testResults.passed++;
        
        // Check for dashboard metrics
        const metricFields = ['totalUsers', 'totalExchanges', 'totalMessages', 'totalDocuments'];
        const hasMetrics = metricFields.some(field => response.data[field] !== undefined);
        
        if (hasMetrics) {
          console.log('✅ Dashboard metrics present');
          this.testResults.passed++;
        } else {
          console.log('❌ Dashboard metrics missing');
          this.testResults.failed++;
        }
        
        // Check for recent activity
        if (response.data.recentActivity || response.data.recent_activity) {
          console.log('✅ Recent activity data present');
          this.testResults.passed++;
        } else {
          console.log('❌ Recent activity data missing');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid dashboard format');
      }
    } catch (error) {
      console.log('❌ Admin dashboard failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test dashboard widgets
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/dashboard/widgets`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Dashboard widgets working (${response.data.length} widgets)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid widgets format');
      }
    } catch (error) {
      console.log('❌ Dashboard widgets failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testUserManagement() {
    console.log('\n👥 Testing User management and administration...'.yellow);
    
    // Test user list
    try {
      const response = await axios.get(`${this.baseURL}/api/users`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ User management working (${response.data.length} users)`);
        this.testResults.passed++;
        
        // Check user structure
        if (response.data.length > 0) {
          const user = response.data[0];
          const requiredFields = ['id', 'email', 'firstName', 'lastName', 'role', 'isActive'];
          const missingFields = requiredFields.filter(field => !user[field]);
          
          if (missingFields.length === 0) {
            console.log('✅ User data structure correct');
            this.testResults.passed++;
          } else {
            console.log(`❌ User missing fields: ${missingFields.join(', ')}`);
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid user data format');
      }
    } catch (error) {
      console.log('❌ User management failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test user creation
    try {
      const userData = {
        email: 'test-admin@example.com',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'Admin',
        role: 'coordinator',
        phone: '+1-555-123-4567'
      };
      
      const response = await axios.post(`${this.baseURL}/api/users`, userData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 201 && response.data.user) {
        console.log('✅ User creation working');
        this.testResults.passed++;
        
        const createdUserId = response.data.user.id;
        
        // Test user update
        try {
          const updateResponse = await axios.put(`${this.baseURL}/api/users/${createdUserId}`, {
            firstName: 'Updated',
            lastName: 'Admin'
          }, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (updateResponse.status === 200) {
            console.log('✅ User update working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${updateResponse.status}`);
          }
        } catch (error) {
          console.log('❌ User update failed:', error.message);
          this.testResults.failed++;
        }
        
        // Test user deactivation
        try {
          const deactivateResponse = await axios.put(`${this.baseURL}/api/users/${createdUserId}/deactivate`, {}, {
            headers: { Authorization: `Bearer ${this.adminToken}` }
          });
          
          if (deactivateResponse.status === 200) {
            console.log('✅ User deactivation working');
            this.testResults.passed++;
          } else {
            throw new Error(`Unexpected status: ${deactivateResponse.status}`);
          }
        } catch (error) {
          console.log('❌ User deactivation failed:', error.message);
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid user creation response');
      }
    } catch (error) {
      console.log('❌ User creation failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testSystemAnalytics() {
    console.log('\n📈 Testing System analytics and reporting...'.yellow);
    
    // Test system statistics
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ System analytics endpoint working');
        this.testResults.passed++;
        
        // Check analytics data
        const analyticsFields = ['userGrowth', 'exchangeActivity', 'messageVolume', 'documentUsage'];
        const hasAnalytics = analyticsFields.some(field => response.data[field] !== undefined);
        
        if (hasAnalytics) {
          console.log('✅ System analytics data present');
          this.testResults.passed++;
        } else {
          console.log('❌ System analytics data incomplete');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid analytics format');
      }
    } catch (error) {
      console.log('❌ System analytics failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test performance metrics
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/performance`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Performance metrics working');
        this.testResults.passed++;
        
        // Check performance data
        const perfFields = ['responseTime', 'uptime', 'errorRate', 'activeUsers'];
        const hasPerfData = perfFields.some(field => response.data[field] !== undefined);
        
        if (hasPerfData) {
          console.log('✅ Performance data present');
          this.testResults.passed++;
        } else {
          console.log('❌ Performance data incomplete');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid performance format');
      }
    } catch (error) {
      console.log('❌ Performance metrics failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test usage statistics
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/usage`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Usage statistics working');
        this.testResults.passed++;
      } else {
        throw new Error('Invalid usage format');
      }
    } catch (error) {
      console.log('❌ Usage statistics failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testSystemConfiguration() {
    console.log('\n⚙️ Testing System configuration and settings...'.yellow);
    
    // Test system settings
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ System settings endpoint working');
        this.testResults.passed++;
        
        // Check settings data
        const settingsFields = ['emailSettings', 'securitySettings', 'integrationSettings'];
        const hasSettings = settingsFields.some(field => response.data[field] !== undefined);
        
        if (hasSettings) {
          console.log('✅ System settings data present');
          this.testResults.passed++;
        } else {
          console.log('❌ System settings data incomplete');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid settings format');
      }
    } catch (error) {
      console.log('❌ System settings failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test updating system settings
    try {
      const settingsData = {
        emailSettings: {
          smtpHost: 'smtp.example.com',
          smtpPort: 587,
          enableNotifications: true
        },
        securitySettings: {
          require2FA: true,
          sessionTimeout: 3600,
          maxLoginAttempts: 5
        }
      };
      
      const response = await axios.put(`${this.baseURL}/api/admin/settings`, settingsData, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.status === 200) {
        console.log('✅ System settings update working');
        this.testResults.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ System settings update failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test feature flags
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/features`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Feature flags working');
        this.testResults.passed++;
      } else {
        throw new Error('Invalid features format');
      }
    } catch (error) {
      console.log('❌ Feature flags failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testAdminReports() {
    console.log('\n📋 Testing Admin reports and exports...'.yellow);
    
    // Test report generation
    try {
      const reportData = {
        type: 'user_activity',
        dateRange: {
          start: '2024-01-01',
          end: '2024-12-31'
        },
        format: 'pdf'
      };
      
      const response = await axios.post(`${this.baseURL}/api/admin/reports`, reportData, {
        headers: { Authorization: `Bearer ${this.adminToken}` },
        responseType: 'blob'
      });
      
      if (response.status === 200 && response.data) {
        console.log('✅ Report generation working');
        this.testResults.passed++;
      } else {
        throw new Error(`Unexpected status: ${response.status}`);
      }
    } catch (error) {
      console.log('❌ Report generation failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test available report types
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/reports/types`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Report types working (${response.data.length} types)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid report types format');
      }
    } catch (error) {
      console.log('❌ Report types failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test scheduled reports
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/reports/scheduled`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ Scheduled reports working (${response.data.length} scheduled)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid scheduled reports format');
      }
    } catch (error) {
      console.log('❌ Scheduled reports failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testSystemHealth() {
    console.log('\n🏥 Testing System health monitoring...'.yellow);
    
    // Test system health check
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/health`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ System health endpoint working');
        this.testResults.passed++;
        
        // Check health status
        if (response.data.status || response.data.health) {
          console.log('✅ System health status present');
          this.testResults.passed++;
        } else {
          console.log('❌ System health status missing');
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid health format');
      }
    } catch (error) {
      console.log('❌ System health failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test database health
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/health/database`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ Database health working');
        this.testResults.passed++;
      } else {
        throw new Error('Invalid database health format');
      }
    } catch (error) {
      console.log('❌ Database health failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test external service health
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/health/services`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && typeof response.data === 'object') {
        console.log('✅ External services health working');
        this.testResults.passed++;
      } else {
        throw new Error('Invalid services health format');
      }
    } catch (error) {
      console.log('❌ External services health failed:', error.message);
      this.testResults.failed++;
    }
    
    // Test system logs
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/logs`, {
        headers: { Authorization: `Bearer ${this.adminToken}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ System logs working (${response.data.length} logs)`);
        this.testResults.passed++;
      } else {
        throw new Error('Invalid system logs format');
      }
    } catch (error) {
      console.log('❌ System logs failed:', error.message);
      this.testResults.failed++;
    }
  }

  printResults() {
    console.log('\n📊 ADMIN DASHBOARD TEST RESULTS'.cyan.bold);
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
  const testSuite = new AdminDashboardTestSuite();
  testSuite.run().catch(console.error);
}

module.exports = AdminDashboardTestSuite;



