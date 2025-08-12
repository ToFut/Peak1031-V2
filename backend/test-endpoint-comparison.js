/**
 * Compare exchanges endpoint vs dashboard endpoint
 */

const supabaseService = require('./services/supabase');
const rbacService = require('./services/rbacService');
const dashboardService = require('./services/dashboardService');

async function testEndpointComparison() {
  console.log('🚀 Testing endpoint data comparison...\n');
  
  // Get both admin and client users
  const { data: users } = await supabaseService.client
    .from('users')
    .select('*')
    .in('email', ['admin@peak1031.com', 'client@peak1031.com']);
  
  for (const user of users) {
    console.log(`\n👤 Testing ${user.email} (${user.role}):`);
    
    // Test 1: Direct RBAC call (what exchanges endpoint uses)
    console.log('1️⃣ Direct RBAC call (/api/exchanges):');
    const rbacResult = await rbacService.getExchangesForUser(user, {
      limit: 50  // matches exchanges endpoint default
    });
    console.log(`   - RBAC count: ${rbacResult.count}`);
    console.log(`   - RBAC returned: ${rbacResult.returnedCount} rows`);
    
    // Test 2: Dashboard service call (what dashboard endpoint uses)
    console.log('\n2️⃣ Dashboard service (/api/dashboard/overview):');
    const dashboardData = await dashboardService.getDashboardData(user.id, user.role);
    console.log(`   - exchanges.total: ${dashboardData.exchanges.total}`);
    console.log(`   - stats.totalExchanges: ${dashboardData.stats?.totalExchanges}`);
    
    // Test 3: Check if there's a discrepancy
    const rbacTotal = rbacResult.count;
    const dashboardTotal = dashboardData.exchanges.total;
    
    if (rbacTotal !== dashboardTotal) {
      console.log(`\n⚠️  DISCREPANCY FOUND:`);
      console.log(`   - RBAC says: ${rbacTotal}`);
      console.log(`   - Dashboard says: ${dashboardTotal}`);
      
      // Check what the dashboard service is actually using
      const stats = await dashboardService.getStatsByRole(user.id, user.role);
      console.log(`   - Stats service says: ${stats.totalExchanges}`);
    } else {
      console.log(`\n✅ Both endpoints agree: ${rbacTotal}`);
    }
  }
  
  console.log('\n✅ Test completed');
}

// Run the test
testEndpointComparison().catch(console.error);