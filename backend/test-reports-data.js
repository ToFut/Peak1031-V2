#!/usr/bin/env node

/**
 * Test Reports Data Pipeline
 * Tests DB → Backend → Frontend data flow for reports
 */

const supabaseService = require('./services/supabase');
const dashboardService = require('./services/dashboardService');
const rbacService = require('./services/rbacService');

async function testDatabaseQueries() {
  console.log('\n🔍 TESTING DATABASE QUERIES');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Get all users with their roles
    console.log('\n1. Testing Users Table:');
    const { data: users, error: usersError } = await supabaseService.client
      .from('users')
      .select('id, email, role, created_at')
      .limit(10);
    
    if (usersError) {
      console.error('❌ Users query error:', usersError);
    } else {
      console.log(`✅ Found ${users?.length || 0} users`);
      users?.forEach(user => {
        console.log(`   - ${user.email} (${user.role}) - ID: ${user.id}`);
      });
    }

    // Test 2: Get exchanges with user assignments
    console.log('\n2. Testing Exchanges Table:');
    const { data: exchanges, error: exchangesError } = await supabaseService.client
      .from('exchanges')
      .select(`
        id, 
        name, 
        status, 
        exchange_value,
        created_at,
        exchange_participants!inner(
          user_id,
          role,
          users(email)
        )
      `)
      .limit(5);
    
    if (exchangesError) {
      console.error('❌ Exchanges query error:', exchangesError);
    } else {
      console.log(`✅ Found ${exchanges?.length || 0} exchanges`);
      exchanges?.forEach(exchange => {
        console.log(`   - ${exchange.name || exchange.id} (${exchange.status}) - $${exchange.exchange_value || 0}`);
        exchange.exchange_participants?.forEach(participant => {
          console.log(`     → ${participant.users?.email} (${participant.role})`);
        });
      });
    }

    // Test 3: Get tasks with user assignments  
    console.log('\n3. Testing Tasks Table:');
    const { data: tasks, error: tasksError } = await supabaseService.client
      .from('tasks')
      .select(`
        id, 
        title, 
        status, 
        priority,
        assigned_to,
        created_at,
        users(email)
      `)
      .limit(5);
    
    if (tasksError) {
      console.error('❌ Tasks query error:', tasksError);
    } else {
      console.log(`✅ Found ${tasks?.length || 0} tasks`);
      tasks?.forEach(task => {
        console.log(`   - ${task.title} (${task.status}) - Assigned to: ${task.users?.email || 'Unassigned'}`);
      });
    }

    // Test 4: Get audit logs for activity tracking
    console.log('\n4. Testing Audit Logs:');
    const { data: auditLogs, error: auditError } = await supabaseService.client
      .from('audit_logs')
      .select('id, action, person_id, created_at, details')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (auditError) {
      console.error('❌ Audit logs query error:', auditError);
    } else {
      console.log(`✅ Found ${auditLogs?.length || 0} recent audit logs`);
      auditLogs?.forEach(log => {
        console.log(`   - ${log.action} by ${log.person_id} at ${new Date(log.created_at).toLocaleString()}`);
      });
    }

  } catch (error) {
    console.error('❌ Database test failed:', error);
  }
}

async function testUserSpecificQueries() {
  console.log('\n👤 TESTING USER-SPECIFIC QUERIES');
  console.log('=' .repeat(50));
  
  try {
    // Get a sample user for testing
    const { data: users } = await supabaseService.client
      .from('users')
      .select('id, email, role')
      .limit(3);
    
    if (!users || users.length === 0) {
      console.log('❌ No users found for testing');
      return;
    }

    for (const user of users) {
      console.log(`\n🧪 Testing data for user: ${user.email} (${user.role})`);
      
      // Test RBAC service
      try {
        const exchangesResult = await rbacService.getExchangesForUser(user);
        console.log(`   ✅ RBAC Exchanges: ${exchangesResult.count || 0} exchanges accessible`);
        
        const tasksResult = await rbacService.getTasksForUser(user);
        console.log(`   ✅ RBAC Tasks: ${tasksResult.count || 0} tasks accessible`);
      } catch (rbacError) {
        console.error(`   ❌ RBAC Error for ${user.email}:`, rbacError.message);
      }

      // Test dashboard service
      try {
        const dashboardData = await dashboardService.getDashboardData(user.id, user.role);
        console.log(`   ✅ Dashboard Data:`, {
          exchanges: dashboardData.exchanges?.total || 0,
          tasks: dashboardData.tasks?.total || 0,
          users: dashboardData.users?.total || 0
        });
      } catch (dashError) {
        console.error(`   ❌ Dashboard Error for ${user.email}:`, dashError.message);
      }
    }

  } catch (error) {
    console.error('❌ User-specific test failed:', error);
  }
}

async function testReportEndpoints() {
  console.log('\n📊 TESTING REPORT ENDPOINTS SIMULATION');
  console.log('=' .repeat(50));
  
  try {
    // Get a sample user
    const { data: users } = await supabaseService.client
      .from('users')
      .select('id, email, role')
      .limit(1);
    
    if (!users || users.length === 0) {
      console.log('❌ No users found for testing');
      return;
    }

    const testUser = users[0];
    console.log(`\n🧪 Simulating report endpoints for: ${testUser.email} (${testUser.role})`);

    // Test Overview Report Data
    console.log('\n📈 Overview Report:');
    try {
      const dashboardData = await dashboardService.getDashboardData(testUser.id, testUser.role);
      const overviewData = {
        totalExchanges: dashboardData.exchanges?.total || 0,
        activeExchanges: dashboardData.exchanges?.active || 0,
        completedExchanges: dashboardData.exchanges?.completed || 0,
        totalTasks: dashboardData.tasks?.total || 0,
        completedTasks: dashboardData.tasks?.completed || 0,
        pendingTasks: dashboardData.tasks?.pending || 0,
      };
      console.log('   ✅ Overview data:', overviewData);
    } catch (error) {
      console.error('   ❌ Overview error:', error.message);
    }

    // Test Exchanges Report Data
    console.log('\n🔄 Exchanges Report:');
    try {
      const rbacResult = await rbacService.getExchangesForUser(testUser);
      const exchanges = rbacResult.data || [];
      
      const statusCounts = exchanges.reduce((acc, e) => {
        acc[e.status?.toLowerCase() || 'unknown'] = (acc[e.status?.toLowerCase() || 'unknown'] || 0) + 1;
        return acc;
      }, {});
      
      console.log('   ✅ Exchange status distribution:', statusCounts);
      console.log('   ✅ Total accessible exchanges:', rbacResult.count || 0);
    } catch (error) {
      console.error('   ❌ Exchanges error:', error.message);
    }

    // Test Tasks Report Data
    console.log('\n✅ Tasks Report:');
    try {
      const rbacResult = await rbacService.getTasksForUser(testUser);
      const tasks = rbacResult.data || [];
      
      const taskStats = {
        total: tasks.length,
        completed: tasks.filter(t => t.status === 'COMPLETED').length,
        inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
        pending: tasks.filter(t => t.status === 'PENDING').length,
      };
      
      console.log('   ✅ Task statistics:', taskStats);
    } catch (error) {
      console.error('   ❌ Tasks error:', error.message);
    }

  } catch (error) {
    console.error('❌ Report endpoints test failed:', error);
  }
}

async function runAllTests() {
  console.log('🚀 STARTING REPORTS DATA PIPELINE TESTS');
  console.log('=' .repeat(60));
  
  await testDatabaseQueries();
  await testUserSpecificQueries();
  await testReportEndpoints();
  
  console.log('\n✨ TESTS COMPLETED');
  console.log('=' .repeat(60));
}

// Run tests
runAllTests().catch(console.error);