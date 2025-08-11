const axios = require('axios');
const BASE_URL = 'http://localhost:5001/api';

async function test() {
  let token = '';
  let userId = '';
  const results = [];

  console.log('\n=== TESTING PEAK 1031 ENDPOINTS ===\n');

  // 1. Login
  console.log('1. Testing Authentication...');
  try {
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    token = loginRes.data.token;
    userId = loginRes.data.user.id;
    console.log('✅ Login successful');
    results.push({ endpoint: 'POST /auth/login', status: 'success' });
  } catch (err) {
    console.log('❌ Login failed:', err.response?.data?.error || err.message);
    results.push({ endpoint: 'POST /auth/login', status: 'failed' });
  }

  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Get current user
  console.log('\n2. Testing Get Current User...');
  try {
    await axios.get(`${BASE_URL}/auth/me`, { headers: authHeaders });
    console.log('✅ GET /auth/me');
    results.push({ endpoint: 'GET /auth/me', status: 'success' });
  } catch (err) {
    console.log('❌ GET /auth/me:', err.response?.status);
    results.push({ endpoint: 'GET /auth/me', status: 'failed' });
  }

  // 3. Get user profile
  console.log('\n3. Testing Profile Endpoints...');
  try {
    await axios.get(`${BASE_URL}/auth/profile`, { headers: authHeaders });
    console.log('✅ GET /auth/profile');
    results.push({ endpoint: 'GET /auth/profile', status: 'success' });
  } catch (err) {
    console.log('❌ GET /auth/profile:', err.response?.status);
    results.push({ endpoint: 'GET /auth/profile', status: 'failed' });
  }

  // 4. Update profile
  try {
    await axios.put(`${BASE_URL}/auth/profile`, {
      firstName: 'Admin',
      lastName: 'User'
    }, { headers: authHeaders });
    console.log('✅ PUT /auth/profile');
    results.push({ endpoint: 'PUT /auth/profile', status: 'success' });
  } catch (err) {
    console.log('❌ PUT /auth/profile:', err.response?.status);
    results.push({ endpoint: 'PUT /auth/profile', status: 'failed' });
  }

  // 5. Dashboard endpoints
  console.log('\n4. Testing Dashboard Endpoints...');
  try {
    await axios.get(`${BASE_URL}/dashboard`, { headers: authHeaders });
    console.log('✅ GET /dashboard');
    results.push({ endpoint: 'GET /dashboard', status: 'success' });
  } catch (err) {
    console.log('❌ GET /dashboard:', err.response?.status);
    results.push({ endpoint: 'GET /dashboard', status: 'failed' });
  }

  try {
    await axios.get(`${BASE_URL}/dashboard/overview`, { headers: authHeaders });
    console.log('✅ GET /dashboard/overview');
    results.push({ endpoint: 'GET /dashboard/overview', status: 'success' });
  } catch (err) {
    console.log('❌ GET /dashboard/overview:', err.response?.status);
    results.push({ endpoint: 'GET /dashboard/overview', status: 'failed' });
  }

  // 6. User management
  console.log('\n5. Testing User Management Endpoints...');
  try {
    await axios.get(`${BASE_URL}/users`, { headers: authHeaders });
    console.log('✅ GET /users');
    results.push({ endpoint: 'GET /users', status: 'success' });
  } catch (err) {
    console.log('❌ GET /users:', err.response?.status);
    results.push({ endpoint: 'GET /users', status: 'failed' });
  }

  try {
    await axios.get(`${BASE_URL}/users/${userId}`, { headers: authHeaders });
    console.log('✅ GET /users/:id');
    results.push({ endpoint: 'GET /users/:id', status: 'success' });
  } catch (err) {
    console.log('❌ GET /users/:id:', err.response?.status);
    results.push({ endpoint: 'GET /users/:id', status: 'failed' });
  }

  try {
    await axios.put(`${BASE_URL}/users/${userId}`, {
      first_name: 'Admin',
      last_name: 'User'
    }, { headers: authHeaders });
    console.log('✅ PUT /users/:id');
    results.push({ endpoint: 'PUT /users/:id', status: 'success' });
  } catch (err) {
    console.log('❌ PUT /users/:id:', err.response?.status);
    results.push({ endpoint: 'PUT /users/:id', status: 'failed' });
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  const successful = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const total = results.length;
  const rate = ((successful / total) * 100).toFixed(1);
  
  console.log(`Total: ${total} | Success: ${successful} | Failed: ${failed} | Rate: ${rate}%`);
  
  if (failed > 0) {
    console.log('\nFailed endpoints:');
    results.filter(r => r.status === 'failed').forEach(r => {
      console.log(`  - ${r.endpoint}`);
    });
  }
}

test().catch(console.error);
