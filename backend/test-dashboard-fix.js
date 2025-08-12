/**
 * Comprehensive test for Agency and Coordinator dashboard exchange visibility
 */

const axios = require('axios');

async function testDashboardAccess() {
  try {
    console.log('🧪 Testing Dashboard Access for Agency and Coordinator\n');
    
    // Test Coordinator
    console.log('1️⃣ Testing COORDINATOR access...');
    const coordinatorLogin = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'coordinator@peak1031.com',
      password: 'password123'
    });
    
    const coordinatorToken = coordinatorLogin.data.token;
    console.log('✅ Coordinator login successful');
    
    const coordinatorExchanges = await axios.get('http://localhost:5001/api/exchanges', {
      headers: { 'Authorization': `Bearer ${coordinatorToken}` }
    });
    
    console.log(`📊 Coordinator sees ${coordinatorExchanges.data.exchanges.length} exchanges:`);
    coordinatorExchanges.data.exchanges.forEach(ex => {
      console.log(`   - ${ex.name || ex.displayName} (${ex.id.substring(0,8)}...)`);
    });
    
    const coordinatorSegevDemo = coordinatorExchanges.data.exchanges.find(ex => 
      ex.id === 'ba7865ac-da20-404a-b609-804d15cb0467'
    );
    
    if (coordinatorSegevDemo) {
      console.log('✅ SUCCESS: Coordinator can see SEGEV DEMO exchange!');
    } else {
      console.log('❌ FAILED: Coordinator cannot see SEGEV DEMO exchange');
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test Agency  
    console.log('2️⃣ Testing AGENCY access...');
    const agencyLogin = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'agency@peak1031.com',
      password: 'password123'
    });
    
    const agencyToken = agencyLogin.data.token;
    console.log('✅ Agency login successful');
    
    const agencyExchanges = await axios.get('http://localhost:5001/api/exchanges', {
      headers: { 'Authorization': `Bearer ${agencyToken}` }
    });
    
    console.log(`📊 Agency sees ${agencyExchanges.data.exchanges.length} exchanges:`);
    agencyExchanges.data.exchanges.forEach(ex => {
      console.log(`   - ${ex.name || ex.displayName} (${ex.id.substring(0,8)}...)`);
    });
    
    const agencySegevDemo = agencyExchanges.data.exchanges.find(ex => 
      ex.id === 'ba7865ac-da20-404a-b609-804d15cb0467'
    );
    
    if (agencySegevDemo) {
      console.log('✅ SUCCESS: Agency can see SEGEV DEMO exchange!');
    } else {
      console.log('❌ FAILED: Agency cannot see SEGEV DEMO exchange');
    }
    
    // Test Agency Third Parties API
    console.log('\n📋 Testing Agency third parties...');
    const agencyThirdParties = await axios.get('http://localhost:5001/api/agency/third-parties', {
      headers: { 'Authorization': `Bearer ${agencyToken}` }
    });
    
    console.log(`📊 Agency manages ${agencyThirdParties.data.thirdParties?.length || 0} third parties:`);
    agencyThirdParties.data.thirdParties?.forEach(tp => {
      console.log(`   - ${tp.name} (${tp.email}) - ${tp.totalExchanges} exchanges`);
    });
    
    console.log('\n🎉 SUMMARY:');
    console.log(`   Coordinator exchanges: ${coordinatorExchanges.data.exchanges.length} (SEGEV DEMO: ${coordinatorSegevDemo ? '✅' : '❌'})`);
    console.log(`   Agency exchanges: ${agencyExchanges.data.exchanges.length} (SEGEV DEMO: ${agencySegevDemo ? '✅' : '❌'})`);
    console.log(`   Agency third parties: ${agencyThirdParties.data.thirdParties?.length || 0}`);
    
    if (coordinatorSegevDemo && agencySegevDemo) {
      console.log('\n🎊 ALL TESTS PASSED! Both users can now see exchanges in their dashboards.');
    } else {
      console.log('\n⚠️ Some tests failed - check the logs above.');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.response?.data || error.message);
  }
}

testDashboardAccess().then(() => {
  console.log('\n🏁 Dashboard access test completed');
  process.exit(0);
});