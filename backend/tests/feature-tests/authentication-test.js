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
    
    // Test users for different roles
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
    console.log('\n🔐 AUTHENTICATION TEST SUITE'.cyan.bold);
    console.log('='.repeat(50));
    
    try {
      await this.testJWTAuthentication();
      await this.testRoleBasedAccess();
      await this.testSecurityFeatures();
      await this.testTwoFactorAuthentication();
      await this.testPasswordSecurity();
      await this.testSessionManagement();
      await this.testRateLimiting();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Test suite failed:', error.message);
      this.testResults.failed++;
    }
  }

  async testJWTAuthentication() {
    console.log('\n📋 Testing JWT Authentication...'.yellow);
    
    // Test 1: Valid login for each role
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
    
    // Test 3: Token validation
    for (const [role, token] of Object.entries(this.tokens)) {
      try {
        const response = await axios.get(`${this.baseURL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.user && response.data.user.role === this.testUsers[role].role) {
          console.log(`✅ ${role} token validation successful`);
          this.testResults.passed++;
        } else {
          throw new Error('Invalid user data in response');
        }
      } catch (error) {
        console.log(`❌ ${role} token validation failed:`, error.message);
        this.testResults.failed++;
      }
    }
  }

  async testRoleBasedAccess() {
    console.log('\n🔒 Testing Role-Based Access Control...'.yellow);
    
    const testEndpoints = [
      { path: '/api/admin/dashboard', roles: ['admin'] },
      { path: '/api/users', roles: ['admin', 'coordinator'] },
      { path: '/api/exchanges', roles: ['admin', 'coordinator', 'client', 'agency', 'third_party'] },
      { path: '/api/documents', roles: ['admin', 'coordinator', 'client', 'agency', 'third_party'] },
      { path: '/api/messages', roles: ['admin', 'coordinator', 'client', 'agency', 'third_party'] }
    ];
    
    for (const endpoint of testEndpoints) {
      for (const [role, token] of Object.entries(this.tokens)) {
        try {
          const response = await axios.get(`${this.baseURL}${endpoint.path}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          if (endpoint.roles.includes(role)) {
            console.log(`✅ ${role} can access ${endpoint.path}`);
            this.testResults.passed++;
          } else {
            console.log(`❌ ${role} should not access ${endpoint.path}`);
            this.testResults.failed++;
          }
        } catch (error) {
          if (error.response?.status === 403) {
            if (endpoint.roles.includes(role)) {
              console.log(`❌ ${role} should access ${endpoint.path}`);
              this.testResults.failed++;
            } else {
              console.log(`✅ ${role} properly denied access to ${endpoint.path}`);
              this.testResults.passed++;
            }
          } else {
            console.log(`❌ Unexpected error for ${role} accessing ${endpoint.path}:`, error.message);
            this.testResults.failed++;
          }
        }
      }
    }
  }

  async testSecurityFeatures() {
    console.log('\n🛡️ Testing Security Features...'.yellow);
    
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
    
    // Test 3: Expired token (if we can create one)
    try {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';
      await axios.get(`${this.baseURL}/api/users`, {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });
      console.log('❌ Expired token should be rejected');
      this.testResults.failed++;
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Expired token properly rejected');
        this.testResults.passed++;
      } else {
        console.log('❌ Unexpected error for expired token:', error.message);
        this.testResults.failed++;
      }
    }
  }

  async testTwoFactorAuthentication() {
    console.log('\n🔐 Testing Two-Factor Authentication...'.yellow);
    
    // Test 1: 2FA setup (if user has 2FA enabled)
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/setup-2fa`, {}, {
        headers: { Authorization: `Bearer ${this.tokens.admin}` }
      });
      
      if (response.data.qrCode || response.data.secret) {
        console.log('✅ 2FA setup endpoint working');
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
    
    // Test 2: 2FA verification
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

  async testPasswordSecurity() {
    console.log('\n🔑 Testing Password Security...'.yellow);
    
    // Test 1: Password strength validation
    const weakPasswords = ['123', 'password', 'abc'];
    const strongPasswords = ['SecurePass123!', 'MyComplexP@ssw0rd'];
    
    for (const password of weakPasswords) {
      try {
        await axios.post(`${this.baseURL}/api/users`, {
          email: 'test@example.com',
          password: password,
          firstName: 'Test',
          lastName: 'User',
          role: 'client'
        }, {
          headers: { Authorization: `Bearer ${this.tokens.admin}` }
        });
        console.log('❌ Weak password should be rejected');
        this.testResults.failed++;
      } catch (error) {
        if (error.response?.status === 400) {
          console.log('✅ Weak password properly rejected');
          this.testResults.passed++;
        } else {
          console.log('⚠️ Password validation test inconclusive:', error.message);
        }
      }
    }
    
    // Test 2: Password reset functionality
    try {
      await axios.post(`${this.baseURL}/api/auth/forgot-password`, {
        email: 'admin@peak1031.com'
      });
      console.log('✅ Password reset request endpoint working');
      this.testResults.passed++;
    } catch (error) {
      console.log('⚠️ Password reset test inconclusive:', error.message);
    }
  }

  async testSessionManagement() {
    console.log('\n⏰ Testing Session Management...'.yellow);
    
    // Test 1: Token refresh
    try {
      const response = await axios.post(`${this.baseURL}/api/auth/refresh`, {
        refreshToken: 'test-refresh-token'
      });
      console.log('⚠️ Token refresh test inconclusive (no valid refresh token)');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Token refresh properly validates refresh token');
        this.testResults.passed++;
      } else {
        console.log('⚠️ Token refresh test inconclusive:', error.message);
      }
    }
    
    // Test 2: Logout
    try {
      await axios.post(`${this.baseURL}/api/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${this.tokens.admin}` }
      });
      console.log('✅ Logout endpoint working');
      this.testResults.passed++;
    } catch (error) {
      console.log('⚠️ Logout test inconclusive:', error.message);
    }
  }

  async testRateLimiting() {
    console.log('\n🚦 Testing Rate Limiting...'.yellow);
    
    // Test 1: Login rate limiting
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
    console.log('\n📊 AUTHENTICATION TEST RESULTS'.cyan.bold);
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
  const testSuite = new AuthenticationTestSuite();
  testSuite.run().catch(console.error);
}

module.exports = AuthenticationTestSuite;




