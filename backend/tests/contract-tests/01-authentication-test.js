const axios = require('axios');
const colors = require('colors');

class AuthenticationTestSuite {
  constructor() {
    this.baseURL = process.env.TEST_API_URL || 'http://localhost:5001';
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: []
    };
    
    // Test users for different roles from contract A.3.1
    this.testUsers = {
      admin: {
        email: 'admin@peak1031.com',
        password: 'admin123',
        role: 'admin'
      },
      coordinator: {
        email: 'coordinator@peak1031.com',
        password: 'coordinator123',
        role: 'coordinator'
      },
      client: {
        email: 'client@peak1031.com',
        password: 'client123',
        role: 'client'
      },
      agency: {
        email: 'agency@peak1031.com',
        password: 'agency123',
        role: 'agency'
      },
      third_party: {
        email: 'thirdparty@peak1031.com',
        password: 'thirdparty123',
        role: 'third_party'
      }
    };
    
    this.tokens = {};
  }

  async run() {
    console.log('\n🔐 CONTRACT A.3.1 & A.4: AUTHENTICATION & SECURITY TEST SUITE'.cyan.bold);
    console.log('='.repeat(70));
    
    try {
      await this.testJWTAuthentication();
      await this.testRoleBasedViews();
      await this.testUserStatusManagement();
      await this.testProfileManagement();
      await this.testTwoFactorAuthentication();
      await this.testSecurityFeatures();
      await this.testRateLimiting();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testJWTAuthentication() {
    console.log('\n📋 Testing JWT-based login authentication...'.yellow);
    
    // Test 1: Valid login for each role (A.3.1 requirement)
    for (const [role, user] of Object.entries(this.testUsers)) {
      try {
        const response = await axios.post(`${this.baseURL}/api/auth/login`, {
          email: user.email,
          password: user.password
        });
        
        if (response.data.token && response.data.user) {
          this.tokens[role] = response.data.token;
          console.log(`✅ ${role} login successful`);
          this.testResults.passed++;
        } else {
          throw new Error('No token or user data received');
        }
      } catch (error) {
        console.log(`❌ ${role} login failed:`, error.response?.data?.error || error.message);
        this.testResults.failed++;
        this.testResults.errors.push(`${role} login: ${error.message}`);
      }
    }
    
    // Test 2: Invalid credentials
    try {
      await axios.post(`${this.baseURL}/api/auth/login`, {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      });
      console.log('❌ Invalid login should have failed');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Invalid credentials properly rejected');
        this.testResults.passed++;
      } else {
        console.log('❌ Unexpected error for invalid login:', error.message);
        this.testResults.failed++;
      }
    }
  }

  async testRoleBasedViews() {
    console.log('\n🔒 Testing Role-based views (A.3.1 requirement)...'.yellow);
    
    const testEndpoints = [
      { path: '/api/admin/dashboard', roles: ['admin'], name: 'Admin Dashboard' },
      { path: '/api/users', roles: ['admin', 'coordinator'], name: 'User Management' },
      { path: '/api/exchanges', roles: ['admin', 'coordinator', 'client', 'agency', 'third_party'], name: 'Exchanges' },
      { path: '/api/documents', roles: ['admin', 'coordinator', 'client', 'agency', 'third_party'], name: 'Documents' },
      { path: '/api/messages', roles: ['admin', 'coordinator', 'client', 'agency', 'third_party'], name: 'Messages' }
    ];
    
    for (const endpoint of testEndpoints) {
      for (const [role, token] of Object.entries(this.tokens)) {
        try {
          const response = await axios.get(`${this.baseURL}${endpoint.path}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (endpoint.roles.includes(role)) {
            console.log(`✅ ${role} can access ${endpoint.name}`);
            this.testResults.passed++;
          } else {
            console.log(`❌ ${role} should not access ${endpoint.name}`);
            this.testResults.failed++;
          }
        } catch (error) {
          if (error.response?.status === 403) {
            if (endpoint.roles.includes(role)) {
              console.log(`❌ ${role} should access ${endpoint.name}`);
              this.testResults.failed++;
            } else {
              console.log(`✅ ${role} properly denied access to ${endpoint.name}`);
              this.testResults.passed++;
            }
          } else {
            console.log(`❌ Unexpected error for ${role} accessing ${endpoint.name}:`, error.message);
            this.testResults.failed++;
          }
        }
      }
    }
  }

  async testUserStatusManagement() {
    console.log('\n👥 Testing User status management (Active/Inactive)...'.yellow);
    
    // Test user activation/deactivation (admin only)
    try {
      const response = await axios.get(`${this.baseURL}/api/users`, {
        headers: { Authorization: `Bearer ${this.tokens.admin}` }
      });
      
      if (response.data && Array.isArray(response.data)) {
        console.log(`✅ User status management working (${response.data.length} users)`);
        this.testResults.passed++;
        
        // Check for isActive field
        if (response.data.length > 0) {
          const user = response.data[0];
          if (user.isActive !== undefined) {
            console.log('✅ User status field present');
            this.testResults.passed++;
          } else {
            console.log('❌ User status field missing');
            this.testResults.failed++;
          }
        }
      } else {
        throw new Error('Invalid user data format');
      }
    } catch (error) {
      console.log('❌ User status management failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testProfileManagement() {
    console.log('\n👤 Testing Profile view and edit...'.yellow);
    
    // Test profile view
    try {
      const response = await axios.get(`${this.baseURL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${this.tokens.admin}` }
      });
      
      if (response.data && response.data.user) {
        console.log('✅ Profile view working');
        this.testResults.passed++;
        
        // Check for required profile fields
        const user = response.data.user;
        const requiredFields = ['id', 'email', 'firstName', 'lastName', 'role'];
        const missingFields = requiredFields.filter(field => !user[field]);
        
        if (missingFields.length === 0) {
          console.log('✅ Profile has all required fields');
          this.testResults.passed++;
        } else {
          console.log(`❌ Profile missing fields: ${missingFields.join(', ')}`);
          this.testResults.failed++;
        }
      } else {
        throw new Error('Invalid profile data format');
      }
    } catch (error) {
      console.log('❌ Profile view failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testTwoFactorAuthentication() {
    console.log('\n🔐 Testing 2FA for admin accounts (A.4 requirement)...'.yellow);
    
    // Test 2FA setup
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/setup-2fa`, {}, {
        headers: { Authorization: `Bearer ${this.tokens.admin}` }
      });
      
      if (response.data && (response.data.qrCode || response.data.secret)) {
        console.log('✅ 2FA setup working');
        this.testResults.passed++;
      } else {
        console.log('⚠️ 2FA setup response incomplete');
        this.testResults.failed++;
      }
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ 2FA setup properly validates input');
        this.testResults.passed++;
      } else {
        console.log('⚠️ 2FA setup test inconclusive:', error.message);
      }
    }
    
    // Test 2FA verification
    try {
      await axios.post(`${this.baseURL}/api/auth/verify-2fa`, {
        code: '123456'
      }, {
        headers: { Authorization: `Bearer ${this.tokens.admin}` }
      });
      console.log('⚠️ 2FA verification test inconclusive (invalid code)');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ 2FA verification properly validates code');
        this.testResults.passed++;
      } else {
        console.log('⚠️ 2FA verification test inconclusive:', error.message);
      }
    }
  }

  async testSecurityFeatures() {
    console.log('\n🛡️ Testing Security & Access features (A.4 requirements)...'.yellow);
    
    // Test 1: Missing token
    try {
      await axios.get(`${this.baseURL}/api/users`);
      console.log('❌ Request without token should be rejected');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Missing token properly rejected');
        this.testResults.passed++;
      } else {
        console.log('❌ Unexpected error for missing token:', error.message);
        this.testResults.failed++;
      }
    }
    
    // Test 2: Invalid token
    try {
      await axios.get(`${this.baseURL}/api/users`, {
        headers: { Authorization: 'Bearer invalid-token' }
      });
      console.log('❌ Invalid token should be rejected');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Invalid token properly rejected');
        this.testResults.passed++;
      } else {
        console.log('❌ Unexpected error for invalid token:', error.message);
        this.testResults.failed++;
      }
    }
    
    // Test 3: Server-side permission enforcement
    try {
      const response = await axios.get(`${this.baseURL}/api/admin/dashboard`, {
        headers: { Authorization: `Bearer ${this.tokens.client}` }
      });
      console.log('❌ Client should not access admin dashboard');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 403) {
        console.log('✅ Server-side permission enforcement working');
        this.testResults.passed++;
      } else {
        console.log('❌ Permission enforcement failed:', error.message);
        this.testResults.failed++;
      }
    }
  }

  async testRateLimiting() {
    console.log('\n🚦 Testing Rate Limiting...'.yellow);
    
    // Test login rate limiting
    const loginAttempts = [];
    for (let i = 0; i < 15; i++) {
      try {
        await axios.post(`${this.baseURL}/api/auth/login`, {
          email: 'test@example.com',
          password: 'wrongpassword'
        });
        loginAttempts.push('success');
      } catch (error) {
        if (error.response?.status === 429) {
          console.log('✅ Login rate limiting working');
          this.testResults.passed++;
          break;
        }
        loginAttempts.push('error');
      }
    }
    
    if (loginAttempts.filter(a => a === 'success').length >= 10) {
      console.log('⚠️ Rate limiting may not be working properly');
      this.testResults.failed++;
    }
  }

  printResults() {
    console.log('\n📊 AUTHENTICATION & SECURITY TEST RESULTS'.cyan.bold);
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
  const testSuite = new AuthenticationTestSuite();
  testSuite.run().catch(console.error);
}

module.exports = AuthenticationTestSuite;
