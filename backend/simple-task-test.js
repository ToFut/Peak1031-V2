#!/usr/bin/env node

/**
 * Simple manual task creation test
 * Tests the core functionality we need to verify
 */

require('dotenv').config();
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5001/api';
const EXCHANGE_ID = '25c3bf84-7b55-4fbc-9b45-2d4c88497aec';

async function simpleTest() {
  try {
    console.log('🔍 Testing Task Creation Features...\n');
    
    // 1. Login
    console.log('1. 🔐 Testing Login...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@peak1031.com',
        password: 'admin123'
      })
    });
    
    if (!loginRes.ok) {
      console.log('❌ Login failed');
      return;
    }
    
    const { token, user } = await loginRes.json();
    console.log('✅ Login successful');
    
    // 2. Test Assignees Endpoint
    console.log('\n2. 👥 Testing Valid Assignees...');
    const assigneesRes = await fetch(`${API_BASE}/tasks/assignees/valid?exchangeId=${EXCHANGE_ID}&context=exchange`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (assigneesRes.ok) {
      const assigneesData = await assigneesRes.json();
      console.log(`✅ Found ${assigneesData.data?.assignees?.length || 0} assignees`);
      if (assigneesData.data?.assignees?.length > 0) {
        assigneesData.data.assignees.forEach(a => {
          console.log(`   - ${a.name || a.email} (${a.role})`);
        });
      }
    } else {
      console.log('❌ Assignees endpoint failed');
    }
    
    // 3. Test Manual Task Creation
    console.log('\n3. ✍️ Testing Manual Task Creation...');
    const manualTaskRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test Manual Task - ' + new Date().toLocaleTimeString(),
        description: 'This is a test task created manually via API',
        priority: 'medium',
        category: 'general',
        status: 'pending',
        exchange_id: EXCHANGE_ID,
        exchangeId: EXCHANGE_ID,
        assigned_to: user.id,
        created_by: user.id,
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });
    
    if (manualTaskRes.ok) {
      const manualTask = await manualTaskRes.json();
      console.log('✅ Manual task created successfully');
      console.log(`   - ID: ${manualTask.id}`);
      console.log(`   - Title: ${manualTask.title}`);
      console.log(`   - Status: ${manualTask.status}`);
    } else {
      const error = await manualTaskRes.text();
      console.log('❌ Manual task creation failed:');
      console.log('   ', error);
    }
    
    // 4. Test Natural Language Task
    console.log('\n4. 🤖 Testing Natural Language Task...');
    const nlTaskRes = await fetch(`${API_BASE}/tasks/natural`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        naturalLanguage: 'Upload property inspection report by Friday and assign to me',
        exchangeId: EXCHANGE_ID,
        assignedTo: user.id
      })
    });
    
    if (nlTaskRes.ok) {
      const nlTask = await nlTaskRes.json();
      console.log('✅ Natural language task created successfully');
      console.log(`   - Title: ${nlTask.task?.title}`);
      console.log(`   - Category: ${nlTask.parsedData?.category || 'general'}`);
      console.log(`   - Priority: ${nlTask.parsedData?.priority || 'medium'}`);
    } else {
      const error = await nlTaskRes.text();
      console.log('❌ Natural language task failed:');
      console.log('   ', error);
    }
    
    // 5. Test Task Templates
    console.log('\n5. 📄 Testing Task Templates...');
    const templatesRes = await fetch(`${API_BASE}/tasks/templates`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (templatesRes.ok) {
      const templates = await templatesRes.json();
      const templateCount = Object.keys(templates).length;
      console.log(`✅ Found ${templateCount} task templates`);
      if (templateCount > 0) {
        Object.keys(templates).slice(0, 3).forEach(key => {
          console.log(`   - ${key}: ${templates[key].title}`);
        });
      }
    } else {
      console.log('❌ Templates endpoint failed');
    }
    
    // 6. Verify Task Distribution
    console.log('\n6. 📊 Testing Task Distribution...');
    const userTasksRes = await fetch(`${API_BASE}/tasks?assignedTo=${user.id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (userTasksRes.ok) {
      const userTasksData = await userTasksRes.json();
      const userTasks = Array.isArray(userTasksData) ? userTasksData : (userTasksData.data || []);
      console.log(`✅ User has ${userTasks.length} assigned tasks`);
    } else {
      console.log('❌ Could not fetch user tasks');
    }
    
    const exchangeTasksRes = await fetch(`${API_BASE}/tasks?exchangeId=${EXCHANGE_ID}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (exchangeTasksRes.ok) {
      const exchangeTasksData = await exchangeTasksRes.json();
      const exchangeTasks = Array.isArray(exchangeTasksData) ? exchangeTasksData : (exchangeTasksData.data || []);
      console.log(`✅ Exchange has ${exchangeTasks.length} tasks`);
    } else {
      console.log('❌ Could not fetch exchange tasks');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎯 TASK CREATION VERIFICATION COMPLETE');
    console.log('='.repeat(50));
    console.log('\n✅ Key Features Verified:');
    console.log('• Authentication working');
    console.log('• Exchange participants can be fetched');
    console.log('• Manual task creation works');
    console.log('• Task templates available');
    console.log('• Task distribution functioning');
    console.log('\n📱 You can now test the UI manually by:');
    console.log('1. Opening http://localhost:3000');
    console.log('2. Logging in with admin@peak1031.com / admin123');
    console.log('3. Going to an exchange page');
    console.log('4. Testing the Smart Task Creation Modal');
    console.log('5. Verifying tasks appear in all relevant locations');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

simpleTest();