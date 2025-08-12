/**
 * Direct test of dashboard data
 */

const supabaseService = require('./services/supabase');
const dashboardService = require('./services/dashboardService');
const rbacService = require('./services/rbacService');

async function testDashboardDirect() {
  console.log('🚀 Testing dashboard data directly...\n');
  
  // Get admin user
  const { data: adminUser } = await supabaseService.client
    .from('users')
    .select('*')
    .eq('email', 'admin@peak1031.com')
    .single();
  
  if (!adminUser) {
    console.error('❌ Admin user not found');
    return;
  }
  
  console.log('👤 Testing with admin user:', adminUser.email);
  
  // Test RBAC service
  console.log('\n1️⃣ Testing RBAC service directly:');
  const rbacResult = await rbacService.getExchangesForUser(adminUser);
  console.log(`   - RBAC count: ${rbacResult.count}`);
  console.log(`   - RBAC data length: ${rbacResult.data?.length}`);
  
  // Test dashboard stats
  console.log('\n2️⃣ Testing dashboard stats:');
  const stats = await dashboardService.getStatsByRole(adminUser.id, adminUser.role);
  console.log(`   - stats.totalExchanges: ${stats.totalExchanges}`);
  
  // Test full dashboard data
  console.log('\n3️⃣ Testing full dashboard data:');
  const dashboardData = await dashboardService.getDashboardData(adminUser.id, adminUser.role);
  console.log(`   - dashboardData.exchanges.total: ${dashboardData.exchanges.total}`);
  console.log(`   - dashboardData.stats.totalExchanges: ${dashboardData.stats?.totalExchanges}`);
  
  // Check if the issue is with status filtering
  console.log('\n4️⃣ Checking status breakdown:');
  console.log(`   - Active: ${dashboardData.exchanges.active}`);
  console.log(`   - Completed: ${dashboardData.exchanges.completed}`);
  console.log(`   - Pending: ${dashboardData.exchanges.pending}`);
  
  console.log('\n✅ Test completed');
}

// Run the test
testDashboardDirect().catch(console.error);