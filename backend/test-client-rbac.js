/**
 * Test RBAC for client user
 */

const supabaseService = require('./services/supabase');
const rbacService = require('./services/rbacService');
const dashboardService = require('./services/dashboardService');

async function testClientRBAC() {
  console.log('🚀 Testing client RBAC...\n');
  
  // Get client user
  const { data: clientUser } = await supabaseService.client
    .from('users')
    .select('*')
    .eq('email', 'client@peak1031.com')
    .single();
  
  if (!clientUser) {
    console.error('❌ Client user not found');
    return;
  }
  
  console.log('👤 Client user:', {
    id: clientUser.id,
    email: clientUser.email,
    role: clientUser.role,
    contact_id: clientUser.contact_id
  });
  
  // Test RBAC service directly
  console.log('\n1️⃣ Testing RBAC service:');
  const rbacResult = await rbacService.getExchangesForUser(clientUser);
  console.log(`   - RBAC count: ${rbacResult.count}`);
  console.log(`   - RBAC data length: ${rbacResult.data?.length}`);
  console.log(`   - RBAC returnedCount: ${rbacResult.returnedCount}`);
  
  // Check if the issue is with the query
  console.log('\n2️⃣ Checking participant assignments directly:');
  const { data: participants, error: pError } = await supabaseService.client
    .from('exchange_participants')
    .select('*')
    .eq('contact_id', clientUser.contact_id || clientUser.id)
    .eq('is_active', true);
  
  console.log(`   - Found ${participants?.length || 0} participant records`);
  if (participants) {
    participants.forEach(p => {
      console.log(`     • Exchange: ${p.exchange_id}, Contact: ${p.contact_id}, Active: ${p.is_active}`);
    });
  }
  
  // Check if client is assigned as client_id directly
  console.log('\n3️⃣ Checking direct client assignments:');
  const { data: clientExchanges } = await supabaseService.client
    .from('exchanges')
    .select('id, exchange_name, client_id')
    .eq('client_id', clientUser.id)
    .limit(10);
  
  console.log(`   - Found ${clientExchanges?.length || 0} exchanges where user is client`);
  
  // Test the full query that RBAC uses
  console.log('\n4️⃣ Testing RBAC query with count:');
  const participantIds = participants?.map(p => p.exchange_id) || [];
  
  if (participantIds.length > 0 || clientExchanges?.length > 0) {
    let orConditions = [];
    orConditions.push(`client_id.eq.${clientUser.id}`);
    if (clientUser.contact_id && clientUser.contact_id !== clientUser.id) {
      orConditions.push(`client_id.eq.${clientUser.contact_id}`);
    }
    if (participantIds.length > 0) {
      orConditions.push(`id.in.(${participantIds.join(',')})`);
    }
    
    const { data, error, count } = await supabaseService.client
      .from('exchanges')
      .select('*', { count: 'exact' })
      .or(orConditions.join(','));
    
    console.log(`   - Query result: ${data?.length || 0} rows returned, total count: ${count}`);
    if (error) {
      console.error('   - Query error:', error);
    }
  }
  
  // Test dashboard service
  console.log('\n5️⃣ Testing dashboard service:');
  const dashboardData = await dashboardService.getDashboardData(clientUser.id, clientUser.role);
  console.log(`   - Dashboard exchanges.total: ${dashboardData.exchanges.total}`);
  console.log(`   - Dashboard stats.totalExchanges: ${dashboardData.stats?.totalExchanges}`);
  
  console.log('\n✅ Test completed');
}

// Run the test
testClientRBAC().catch(console.error);