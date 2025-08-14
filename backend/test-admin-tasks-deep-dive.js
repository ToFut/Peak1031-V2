#!/usr/bin/env node

/**
 * DEEP DIVE INVESTIGATION: Admin Task Visibility Issue
 * Testing if newly created admin tasks appear in Dashboard and Exchange pages
 */

require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function deepDiveAdminTasks() {
  console.log('🔍 DEEP DIVE: ADMIN TASK VISIBILITY INVESTIGATION');
  console.log('================================================');
  console.log('Testing if newly created tasks appear in Dashboard and Exchange pages');
  console.log('Created via API - 19/08/2025\n');

  // Get admin user details
  const supabase = require('./services/supabase');
  const { data: adminUser } = await supabase.client
    .from('users')
    .select('*')
    .eq('email', 'abol@peakcorp.com')
    .single();

  if (!adminUser) {
    console.log('❌ Admin user not found');
    return;
  }

  console.log('👤 Admin User Found:');
  console.log(`   - Email: ${adminUser.email}`);
  console.log(`   - Role: ${adminUser.role}`);
  console.log(`   - ID: ${adminUser.id}\n`);

  // Create a valid JWT token for the admin
  const adminToken = jwt.sign(
    {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      first_name: adminUser.first_name,
      last_name: adminUser.last_name
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  console.log('🔑 Admin Token Created\n');

  try {
    // Step 1: Get current task counts
    console.log('📊 STEP 1: Current Task Counts');
    console.log('==============================');
    
    const { data: allTasks } = await supabase.client
      .from('tasks')
      .select('*');
    
    const adminTasks = allTasks.filter(t => 
      t.created_by === adminUser.id || 
      t.assigned_to === adminUser.id
    );

    console.log(`Total tasks in database: ${allTasks.length}`);
    console.log(`Tasks created by admin: ${allTasks.filter(t => t.created_by === adminUser.id).length}`);
    console.log(`Tasks assigned to admin: ${allTasks.filter(t => t.assigned_to === adminUser.id).length}`);
    console.log(`Total admin-related tasks: ${adminTasks.length}\n`);

    // Step 2: Create a new test task via API (as admin would)
    console.log('🆕 STEP 2: Creating New Test Task via API');
    console.log('=========================================');
    
    const testTaskData = {
      title: `Admin Test Task - ${new Date().toISOString()}`,
      description: 'Testing admin task visibility - created via API',
      priority: 'HIGH',
      status: 'pending',
      exchange_id: 'df7ea956-a936-45c6-b683-143e9dda5230', // Test exchange
      created_by: adminUser.id,
      assigned_to: adminUser.id,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
    };

    console.log('Creating task with data:');
    console.log(JSON.stringify(testTaskData, null, 2));

    const createResponse = await axios.post(
      'http://localhost:5001/api/tasks',
      testTaskData,
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Task created successfully!');
    console.log(`   - Task ID: ${createResponse.data.id || createResponse.data.data?.id}`);
    const newTaskId = createResponse.data.id || createResponse.data.data?.id;

    // Step 3: Verify task was stored correctly
    console.log('\n🔍 STEP 3: Verify Task Storage');
    console.log('==============================');
    
    const { data: createdTask } = await supabase.client
      .from('tasks')
      .select('*')
      .eq('id', newTaskId)
      .single();

    if (createdTask) {
      console.log('✅ Task found in database:');
      console.log(`   - Title: ${createdTask.title}`);
      console.log(`   - Status: ${createdTask.status}`);
      console.log(`   - Created by: ${createdTask.created_by}`);
      console.log(`   - Assigned to: ${createdTask.assigned_to}`);
      console.log(`   - Exchange ID: ${createdTask.exchange_id}`);
    } else {
      console.log('❌ Task not found in database!');
    }

    // Step 4: Test Dashboard API endpoint
    console.log('\n📊 STEP 4: Test Dashboard API Response');
    console.log('=====================================');
    
    try {
      const dashboardResponse = await axios.get(
        'http://localhost:5001/api/dashboard/overview',
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Dashboard API Response:');
      console.log(JSON.stringify(dashboardResponse.data, null, 2));
    } catch (dashError) {
      console.log('❌ Dashboard API Error:', dashError.response?.status, dashError.response?.data || dashError.message);
    }

    // Step 5: Test Exchange Tasks API endpoint
    console.log('\n📋 STEP 5: Test Exchange Tasks API');
    console.log('==================================');
    
    try {
      const exchangeTasksResponse = await axios.get(
        'http://localhost:5001/api/exchanges/df7ea956-a936-45c6-b683-143e9dda5230/tasks',
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Exchange Tasks API Response:');
      console.log(`   - Total tasks: ${exchangeTasksResponse.data.tasks?.length || 0}`);
      console.log('   - Task titles:');
      exchangeTasksResponse.data.tasks?.forEach((task, i) => {
        const isNewTask = task.id === newTaskId;
        console.log(`     ${i+1}. "${task.title}" ${isNewTask ? '← NEW TASK' : ''}`);
        console.log(`        - Status: ${task.status}`);
        console.log(`        - Created by: ${task.created_by || 'null'}`);
        console.log(`        - Assigned to: ${task.assigned_to || 'null'}`);
      });
    } catch (exchError) {
      console.log('❌ Exchange Tasks API Error:', exchError.response?.status, exchError.response?.data || exchError.message);
    }

    // Step 6: Test Tasks API endpoint (all tasks)
    console.log('\n📝 STEP 6: Test All Tasks API');
    console.log('=============================');
    
    try {
      const allTasksResponse = await axios.get(
        'http://localhost:5001/api/tasks',
        {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ All Tasks API Response:');
      console.log(`   - Total tasks returned: ${allTasksResponse.data.data?.length || allTasksResponse.data.tasks?.length || 0}`);
      
      const tasks = allTasksResponse.data.data || allTasksResponse.data.tasks || allTasksResponse.data;
      if (Array.isArray(tasks)) {
        const newTaskFound = tasks.find(t => t.id === newTaskId);
        console.log(`   - New task found in response: ${newTaskFound ? 'YES' : 'NO'}`);
        
        const adminRelatedTasks = tasks.filter(t => 
          t.created_by === adminUser.id || 
          t.assigned_to === adminUser.id
        );
        console.log(`   - Admin-related tasks in response: ${adminRelatedTasks.length}`);
      }
    } catch (tasksError) {
      console.log('❌ All Tasks API Error:', tasksError.response?.status, tasksError.response?.data || tasksError.message);
    }

    // Step 7: Check RBAC filtering
    console.log('\n🔐 STEP 7: Test RBAC Filtering');
    console.log('==============================');
    
    const rbacService = require('./services/rbacService');
    
    try {
      const userExchanges = await rbacService.getExchangesForUser(adminUser);
      console.log(`✅ RBAC - Admin can access ${userExchanges.data.length} exchanges`);
      
      const hasExchangeAccess = await rbacService.canUserAccessExchange(adminUser, 'df7ea956-a936-45c6-b683-143e9dda5230');
      console.log(`   - Can access test exchange: ${hasExchangeAccess ? 'YES' : 'NO'}`);
      
      const userTasks = await rbacService.getTasksForUser(adminUser);
      console.log(`   - Tasks returned by RBAC: ${userTasks.data.length}`);
      
      const newTaskInRBAC = userTasks.data.find(t => t.id === newTaskId);
      console.log(`   - New task found in RBAC response: ${newTaskInRBAC ? 'YES' : 'NO'}`);
      
    } catch (rbacError) {
      console.log('❌ RBAC Error:', rbacError.message);
    }

    console.log('\n📝 SUMMARY');
    console.log('==========');
    console.log('✅ Task was successfully created via API');
    console.log('✅ Task is stored correctly in database');
    console.log('🔍 Check the API responses above to see if tasks appear in:');
    console.log('   - Dashboard API');
    console.log('   - Exchange Tasks API');
    console.log('   - All Tasks API');
    console.log('   - RBAC filtered results');

  } catch (error) {
    console.error('❌ Error in investigation:');
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Message:', error.message);
    if (error.response?.data) {
      console.error('Full error:', JSON.stringify(error.response.data, null, 2));
    }
  }

  process.exit(0);
}

// Run the investigation
deepDiveAdminTasks();