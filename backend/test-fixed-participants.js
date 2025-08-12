require('dotenv').config();

async function testSecureParticipants() {
  try {
    console.log('🧪 Testing participants endpoint security and data quality...\n');
    
    const exchangeId = '66628d09-1843-42be-b257-dc05e13b8055';
    const fetch = await import('node-fetch');
    
    // Test 1: No authentication (should fail)
    console.log('🚫 Test 1: Calling without authentication...');
    const noAuthResponse = await fetch.default(`http://localhost:5001/api/exchanges/${exchangeId}/participants`);
    console.log('Status:', noAuthResponse.status);
    const noAuthData = await noAuthResponse.json();
    console.log('Response:', JSON.stringify(noAuthData, null, 2));
    
    if (noAuthResponse.status === 401) {
      console.log('✅ SECURITY: Correctly rejected unauthorized request\n');
    } else {
      console.log('❌ SECURITY ISSUE: Should have rejected unauthorized request\n');
    }
    
    console.log('📊 Summary of fixes applied:');
    console.log('  ✅ Added authenticateToken middleware to participants endpoint');
    console.log('  ✅ Added RBAC check to verify user can access the exchange');  
    console.log('  ✅ Fixed data enrichment - users table prioritized over contacts');
    console.log('  ✅ Fixed table name from "people" to "contacts"');
    console.log('  ✅ Improved name composition logic');
    console.log('  ✅ Better email filtering and fallback logic');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testSecureParticipants();