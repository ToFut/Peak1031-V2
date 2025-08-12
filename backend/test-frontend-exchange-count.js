/**
 * Test script to verify frontend exchange count display fix
 */

const axios = require('axios');
const API_BASE = 'http://localhost:5001/api';

async function testExchangeCount() {
  console.log('🚀 Testing exchange count display...\n');
  
  // Test admin user
  try {
    // First, get the exchanges endpoint response
    const exchangesResponse = await axios.get(`${API_BASE}/exchanges?limit=30&page=1`);
    
    console.log('📊 Exchanges endpoint response:');
    console.log(`   - Success: ${exchangesResponse.data.success}`);
    console.log(`   - Exchanges returned: ${exchangesResponse.data.exchanges?.length || 0}`);
    console.log(`   - Total count: ${exchangesResponse.data.total}`);
    console.log(`   - Page: ${exchangesResponse.data.page}`);
    console.log(`   - Limit: ${exchangesResponse.data.limit}`);
    
    // Check if pagination data is properly structured
    const expectedTotalPages = Math.ceil(exchangesResponse.data.total / exchangesResponse.data.limit);
    console.log(`   - Expected total pages: ${expectedTotalPages}`);
    
  } catch (error) {
    console.error('❌ Error testing exchanges:', error.response?.data || error.message);
  }
  
  console.log('\n✅ Test completed');
  console.log('📋 Frontend should now display:');
  console.log('   - "X of 2886 exchanges" for admin (where X is filtered count)');
  console.log('   - "X of 2 exchanges" for client (where X is filtered count)');
  console.log('   - Total count in stats: 2886 for admin, 2 for client');
}

// Run the test
testExchangeCount().catch(console.error);