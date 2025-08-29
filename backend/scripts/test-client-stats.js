require('dotenv').config();
const rbacService = require('../services/rbacService');
const dashboardService = require('../services/dashboardService');
const supabaseService = require('../services/supabase');
const supabaseAdmin = supabaseService.client;

async function testClientStats() {
  try {
    console.log('🔍 Testing client statistics filtering...\n');
    
    // Get the client user
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'client@peak1031.com')
      .single();
    
    if (userError || !user) {
      console.error('User not found:', userError);
      return;
    }
    
    console.log('👤 Testing with user:');
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Role: ${user.role}`);
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Contact ID: ${user.contact_id}`);
    
    // Test RBAC service
    console.log('\n📊 Testing RBAC Service:');
    const rbacResult = await rbacService.getExchangesForUser(user);
    console.log(`  - Total exchanges from RBAC: ${rbacResult.count}`);
    console.log(`  - Data returned: ${rbacResult.data?.length || 0} exchanges`);
    if (rbacResult.data && rbacResult.data.length > 0) {
      console.log('  - Sample exchanges:');
      rbacResult.data.slice(0, 3).forEach(ex => {
        console.log(`    • ${ex.name} (${ex.status})`);
      });
    }
    
    // Test Dashboard Service
    console.log('\n📊 Testing Dashboard Service Stats:');
    const stats = await dashboardService.getStatsByRole(user.id, user.role);
    console.log('  Stats returned:');
    console.log(`    - Total Exchanges: ${stats.totalExchanges || 0}`);
    console.log(`    - Active Exchanges: ${stats.activeExchanges || 0}`);
    console.log(`    - Completed Exchanges: ${stats.completedExchanges || 0}`);
    console.log(`    - Pending Exchanges: ${stats.pendingExchanges || 0}`);
    console.log(`    - Total Tasks: ${stats.totalTasks || 0}`);
    
    // Compare with actual participant data
    console.log('\n✅ Verifying against actual participant data:');
    const { data: actualParticipants } = await supabaseAdmin
      .from('exchange_participants')
      .select('exchange_id')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    console.log(`  - Actual assignments: ${actualParticipants?.length || 0} exchanges`);
    
    if (actualParticipants?.length !== stats.totalExchanges) {
      console.log(`  ⚠️  MISMATCH: Stats show ${stats.totalExchanges} but user has ${actualParticipants?.length} assignments`);
    } else {
      console.log(`  ✅ CORRECT: Stats match actual assignments`);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testClientStats();