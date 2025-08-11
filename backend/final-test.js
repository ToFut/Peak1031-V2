const axios = require('axios');
const BASE_URL = 'http://localhost:5001/api';

async function runFinalTest() {
  let token = '';
  let userId = '';
  const results = [];

  console.log('\n🧪 FINAL ENDPOINT TESTING\n');
  console.log('='.repeat(50));

  // Login
  console.log('\n1. Authentication Test');
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    token = loginRes.data.token;
    userId = loginRes.data.user.id;
    console.log('✅ Login successful');
    results.push({ endpoint: 'POST /auth/login', status: 'success', code: 200 });
  } catch (err) {
    console.log('❌ Login failed:', err.response?.status);
    results.push({ endpoint: 'POST /auth/login', status: 'failed', code: err.response?.status });
    return; // Can't continue without token
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // Test all key endpoints
  const tests = [
    { method: 'GET', path: '/auth/me', description: 'Current user' },
    { method: 'GET', path: '/auth/profile', description: 'User profile' },
    { method: 'GET', path: '/dashboard', description: 'Main dashboard' },
    { method: 'GET', path: '/dashboard/overview', description: 'Dashboard overview' },
    { method: 'GET', path: '/users', description: 'All users' },
    { method: 'GET', path: `/users/${userId}`, description: 'Specific user' }
  ];

  console.log('\n2. Endpoint Tests');
  for (const test of tests) {
    try {
      const response = await axios({
        method: test.method,
        url: `${BASE_URL}${test.path}`,
        headers: authHeaders
      });
      console.log(`✅ ${test.method} ${test.path} - ${test.description} (${response.status})`);
      results.push({ endpoint: `${test.method} ${test.path}`, status: 'success', code: response.status });
    } catch (err) {
      const status = err.response?.status || 'ERROR';
      console.log(`❌ ${test.method} ${test.path} - ${test.description} (${status})`);
      results.push({ endpoint: `${test.method} ${test.path}`, status: 'failed', code: status });
    }
  }

  // Test profile update
  console.log('\n3. Profile Update Test');
  try {
    await axios.put(`${BASE_URL}/auth/profile`, {
      firstName: 'Admin',
      lastName: 'User',
      phone: '+1234567890'
    }, { headers: authHeaders });
    console.log('✅ PUT /auth/profile - Profile update (200)');
    results.push({ endpoint: 'PUT /auth/profile', status: 'success', code: 200 });
  } catch (err) {
    const status = err.response?.status || 'ERROR';
    console.log(`❌ PUT /auth/profile - Profile update (${status})`);
    results.push({ endpoint: 'PUT /auth/profile', status: 'failed', code: status });
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const total = results.length;
  const rate = ((successful / total) * 100).toFixed(1);
  
  console.log(`Total Endpoints: ${total}`);
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${rate}%`);
  
  if (successful === total) {
    console.log('\n🎉 ALL ENDPOINTS WORKING PERFECTLY\!');
  } else if (rate >= 80) {
    console.log('\n✨ Most endpoints working well\!');
  } else {
    console.log('\n⚠️  Some endpoints need attention.');
  }

  if (failed > 0) {
    console.log('\n❌ Failed Endpoints:');
    results.filter(r => r.status === 'failed').forEach(r => {
      console.log(`   ${r.endpoint} (${r.code})`);
    });
  }

  console.log('\n✅ Testing completed\!');
}

runFinalTest().catch(console.error);
