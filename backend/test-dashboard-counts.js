/**
 * Test dashboard counts for different users
 */

const axios = require('axios');
const API_BASE = 'http://localhost:5001/api';

const testCredentials = [
  { email: 'admin@peak1031.com', password: 'peakAdmin2024!', expectedExchanges: 2886 },
  { email: 'client@peak1031.com', password: 'clientPass123!', expectedExchanges: 2 }
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

async function testDashboard(token, userEmail) {
  try {
    console.log(`\n📊 Testing dashboard for ${userEmail}:`);
    
    // Test dashboard overview endpoint
    const overviewResponse = await axios.get(`${API_BASE}/dashboard/overview`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = overviewResponse.data?.data || overviewResponse.data;
    
    console.log('✅ Dashboard response structure:');
    console.log(`   - Has data wrapper: ${!!overviewResponse.data.data}`);
    console.log(`   - Has exchanges: ${!!data.exchanges}`);
    console.log(`   - Exchanges total: ${data.exchanges?.total || 'undefined'}`);
    console.log(`   - Stats total exchanges: ${data.stats?.totalExchanges || 'undefined'}`);
    console.log(`   - Raw exchanges object:`, JSON.stringify(data.exchanges, null, 2));
    
    return data;
  } catch (error) {
    console.error(`❌ Dashboard test failed:`, error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Starting dashboard count tests...\n');
  
  for (const creds of testCredentials) {
    const auth = await loginUser(creds.email, creds.password);
    if (!auth) continue;
    
    const dashboardData = await testDashboard(auth.token, creds.email);
    
    if (dashboardData) {
      const actualCount = dashboardData.exchanges?.total || 0;
      const isCorrect = actualCount === creds.expectedExchanges;
      
      console.log(`\n📈 Result for ${creds.email}:`);
      console.log(`   Expected: ${creds.expectedExchanges} exchanges`);
      console.log(`   Actual: ${actualCount} exchanges`);
      console.log(`   Status: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    }
  }
  
  console.log('\n✅ Tests completed');
}

// Run the tests
runTests().catch(console.error);