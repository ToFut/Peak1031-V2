/**
 * Detailed dashboard count test with direct database queries
 */

const supabaseService = require('./services/supabase');
const dashboardService = require('./services/dashboardService');
const rbacService = require('./services/rbacService');

async function testDashboardCounts() {
  console.log('🚀 Testing dashboard counts with direct service calls...\n');
  
  // Get test users
  const { data: users } = await supabaseService.client
    .from('users')
    .select('*')
    .in('email', ['admin@peak1031.com', 'client@peak1031.com']);
  
  if (!users || users.length === 0) {
    console.error('❌ Test users not found');
    return;
  }
  
  for (const user of users) {
    console.log(`\n📊 Testing for ${user.email} (${user.role}):`);
    
    // Test RBAC service directly
    console.log('\n1️⃣ Testing RBAC service:');
    const rbacResult = await rbacService.getExchangesForUser(user);
    console.log(`   - RBAC count: ${rbacResult.count}`);
    console.log(`   - RBAC returned: ${rbacResult.returnedCount} rows`);
    console.log(`   - RBAC data length: ${rbacResult.data?.length || 0}`);
    
    // Test dashboard service
    console.log('\n2️⃣ Testing dashboard service:');
    const stats = await dashboardService.getStatsByRole(user.id, user.role);
    console.log(`   - Total exchanges: ${stats.totalExchanges}`);
    console.log(`   - Active exchanges: ${stats.activeExchanges}`);
    console.log(`   - My/Managed exchanges: ${stats.myExchanges || stats.managedExchanges || 'N/A'}`);
    
    // Test full dashboard data
    console.log('\n3️⃣ Testing full dashboard data:');
    const dashboardData = await dashboardService.getDashboardData(user.id, user.role);
    console.log(`   - exchanges.total: ${dashboardData.exchanges?.total}`);
    console.log(`   - stats.totalExchanges: ${dashboardData.stats?.totalExchanges}`);
    
    // Direct database query for verification
    console.log('\n4️⃣ Direct database verification:');
    if (user.role === 'admin') {
      const { count: totalCount } = await supabaseService.client
        .from('exchanges')
        .select('*', { count: 'exact', head: true });
      console.log(`   - Database total: ${totalCount} exchanges`);
    } else if (user.role === 'client') {
      // Check participant assignments
      const { data: participants } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id')
        .eq('contact_id', user.contact_id || user.id)
        .eq('is_active', true);
      console.log(`   - Participant in: ${participants?.length || 0} exchanges`);
      
      // Check as client
      const { count: clientCount } = await supabaseService.client
        .from('exchanges')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', user.id);
      console.log(`   - Client of: ${clientCount} exchanges`);
    }
  }
  
  console.log('\n✅ Test completed');
}

// Run the test
testDashboardCounts().catch(console.error);