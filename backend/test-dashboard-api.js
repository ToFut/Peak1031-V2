/**
 * Test dashboard API endpoint directly
 */

const axios = require('axios');
const API_BASE = 'http://localhost:5001/api';

const testUsers = [
  { email: 'admin@peak1031.com', password: 'peakAdmin2024!' },
  { email: 'client@peak1031.com', password: 'clientPass123!' }
];

async function loginUser(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    return response.data.data || response.data;
  } catch (error) {
    console.error(`❌ Login failed for ${email}:`, error.response?.data || error.message);
    return null;
  }
}

async function testDashboardAPI() {
  console.log('🚀 Testing dashboard API endpoint...\n');
  
  for (const user of testUsers) {
    const auth = await loginUser(user.email, user.password);
    if (!auth || !auth.token) {
      console.error(`❌ Failed to login ${user.email}`);
      continue;
    }
    
    console.log(`\n📊 Testing ${user.email}:`);
    
    try {
      // Test dashboard overview endpoint
      const response = await axios.get(`${API_BASE}/dashboard/overview`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      const data = response.data;
      console.log('   Response structure:', {
        hasSuccess: 'success' in data,
        hasData: 'data' in data,
        directExchanges: data.exchanges ? 'YES' : 'NO'
      });
      
      const dashboardData = data.data || data;
      
      console.log('   Dashboard data:', {
        'exchanges.total': dashboardData.exchanges?.total,
        'stats.totalExchanges': dashboardData.stats?.totalExchanges,
        'user.role': dashboardData.user?.role
      });
      
      // Also test the exchanges endpoint
      const exchangesResponse = await axios.get(`${API_BASE}/exchanges?limit=1`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      console.log('   Exchanges endpoint:', {
        total: exchangesResponse.data.total,
        success: exchangesResponse.data.success,
        exchangesCount: exchangesResponse.data.exchanges?.length
      });
      
    } catch (error) {
      console.error(`   ❌ API error:`, error.response?.data || error.message);
    }
  }
  
  console.log('\n✅ Test completed');
}

// Run the test
testDashboardAPI().catch(console.error);