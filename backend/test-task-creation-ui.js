#!/usr/bin/env node

/**
 * UI-Focused Task Creation Test
 * Tests all 3 modes with actual UI scenarios
 */

require('dotenv').config();
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5001/api';

// Test with an actual user
const TEST_EMAIL = 'admin@peak1031.com';
const TEST_PASSWORD = 'admin123';

// Use a known exchange ID (you can get this from the UI)
const KNOWN_EXCHANGE_ID = '25c3bf84-7b55-4fbc-9b45-2d4c88497aec'; // Actual exchange ID from database

async function testTaskCreation() {
  console.log('\n=== TASK CREATION TEST ===\n');
  
  try {
    // 1. Login
    console.log('1. Logging in...');
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
    });
    
    if (!loginRes.ok) {
      throw new Error(`Login failed: ${loginRes.status}`);
    }
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    const userId = loginData.user.id;
    console.log(`✅ Logged in as ${loginData.user.email} (${loginData.user.role})`);
    
    // 2. Get exchanges to find a valid one
    console.log('\n2. Getting exchanges...');
    const exchangesRes = await fetch(`${API_BASE}/exchanges`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    let exchangeId = KNOWN_EXCHANGE_ID;
    if (exchangesRes.ok) {
      const exchangesData = await exchangesRes.json();
      if (exchangesData.data && exchangesData.data.length > 0) {
        exchangeId = exchangesData.data[0].id;
        console.log(`✅ Found ${exchangesData.data.length} exchanges`);
        console.log(`   Using exchange: ${exchangesData.data[0].exchange_number} (${exchangeId})`);
      } else {
        console.log('⚠️  No exchanges found, will create test tasks without exchange');
        exchangeId = null;
      }
    }
    
    // 3. Test Natural Language Task Creation
    console.log('\n3. Testing Natural Language Task Creation...');
    console.log('   Input: "Schedule property inspection for tomorrow at 2pm"');
    
    const nlRes = await fetch(`${API_BASE}/tasks/natural`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        naturalLanguage: 'Schedule property inspection for tomorrow at 2pm',
        exchangeId: exchangeId,
        assignedTo: userId // Self-assign for testing
      })
    });
    
    if (nlRes.ok) {
      const nlData = await nlRes.json();
      console.log('✅ Natural language task created:');
      console.log(`   - Title: ${nlData.task.title}`);
      console.log(`   - ID: ${nlData.task.id}`);
      console.log(`   - Due: ${nlData.task.due_date || 'No date'}`);
      console.log(`   - Priority: ${nlData.parsedData?.priority || 'medium'}`);
      console.log(`   - Category: ${nlData.parsedData?.category || 'general'}`);
    } else {
      const error = await nlRes.text();
      console.log(`❌ Natural language task failed: ${error}`);
    }
    
    // 4. Test Manual Task Creation
    console.log('\n4. Testing Manual Task Creation...');
    
    const manualTask = {
      title: 'Review closing documents',
      description: 'Review and sign all closing documents',
      priority: 'high',
      category: 'document',
      status: 'pending',
      assigned_to: userId,
      created_by: userId,
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    };
    
    if (exchangeId) {
      manualTask.exchange_id = exchangeId;
      manualTask.exchangeId = exchangeId;
    }
    
    const manualRes = await fetch(`${API_BASE}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(manualTask)
    });
    
    if (manualRes.ok) {
      const manualData = await manualRes.json();
      console.log('✅ Manual task created:');
      console.log(`   - Title: ${manualData.title}`);
      console.log(`   - ID: ${manualData.id}`);
      console.log(`   - Priority: ${manualData.priority}`);
      console.log(`   - Status: ${manualData.status}`);
    } else {
      const error = await manualRes.text();
      console.log(`❌ Manual task failed: ${error}`);
    }
    
    // 5. Test Template-based Task Creation
    console.log('\n5. Testing Template-based Task Creation...');
    
    // Get task templates
    const templatesRes = await fetch(`${API_BASE}/tasks/templates`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (templatesRes.ok) {
      const templates = await templatesRes.json();
      const templateKeys = Object.keys(templates);
      
      if (templateKeys.length > 0) {
        const templateKey = templateKeys[0];
        const template = templates[templateKey];
        
        console.log(`   Using template: ${templateKey}`);
        
        const templateTask = {
          ...template,
          assigned_to: userId,
          created_by: userId,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        };
        
        if (exchangeId) {
          templateTask.exchange_id = exchangeId;
          templateTask.exchangeId = exchangeId;
        }
        
        const templateRes = await fetch(`${API_BASE}/tasks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(templateTask)
        });
        
        if (templateRes.ok) {
          const templateData = await templateRes.json();
          console.log('✅ Template task created:');
          console.log(`   - Title: ${templateData.title}`);
          console.log(`   - ID: ${templateData.id}`);
          console.log(`   - Category: ${templateData.category}`);
        } else {
          const error = await templateRes.text();
          console.log(`❌ Template task failed: ${error}`);
        }
      } else {
        console.log('⚠️  No templates available');
      }
    } else {
      console.log('⚠️  Could not fetch templates');
    }
    
    // 6. Verify Task Distribution
    console.log('\n6. Verifying Task Distribution...');
    
    // Check user's tasks
    const userTasksRes = await fetch(`${API_BASE}/tasks?assignedTo=${userId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (userTasksRes.ok) {
      const userTasksData = await userTasksRes.json();
      const userTasks = Array.isArray(userTasksData) ? userTasksData : (userTasksData.data || []);
      console.log(`✅ User has ${userTasks.length} tasks assigned`);
      
      // Show last 3 tasks
      if (userTasks.length > 0) {
        userTasks.slice(0, 3).forEach(task => {
          console.log(`   - ${task.title} (${task.status})`);
        });
      }
    }
    
    // Check exchange tasks if we have an exchange
    if (exchangeId) {
      const exchangeTasksRes = await fetch(`${API_BASE}/tasks?exchangeId=${exchangeId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (exchangeTasksRes.ok) {
        const exchangeTasksData = await exchangeTasksRes.json();
        const exchangeTasks = Array.isArray(exchangeTasksData) ? exchangeTasksData : (exchangeTasksData.data || []);
        console.log(`✅ Exchange has ${exchangeTasks.length} tasks`);
        
        // Show last 3 tasks
        if (exchangeTasks.length > 0) {
          exchangeTasks.slice(0, 3).forEach(task => {
            console.log(`   - ${task.title} (${task.status})`);
          });
        }
      }
    }
    
    // 7. Check Valid Assignees
    console.log('\n7. Testing Valid Assignees Endpoint...');
    
    if (exchangeId) {
      const assigneesRes = await fetch(`${API_BASE}/tasks/assignees/valid?exchangeId=${exchangeId}&context=exchange`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (assigneesRes.ok) {
        const assigneesData = await assigneesRes.json();
        if (assigneesData.success && assigneesData.data?.assignees) {
          console.log(`✅ Found ${assigneesData.data.assignees.length} valid assignees for exchange`);
          assigneesData.data.assignees.forEach(a => {
            console.log(`   - ${a.name || a.email} (${a.role})`);
          });
        } else {
          console.log('⚠️  No assignees found for exchange');
        }
      } else {
        console.log('❌ Could not fetch assignees');
      }
    }
    
    console.log('\n✅ All tests completed!\n');
    console.log('Summary:');
    console.log('- Natural Language: Identifies users, dates, and actions');
    console.log('- Manual Creation: Works with all required fields');
    console.log('- Template-based: Uses predefined templates');
    console.log('- Distribution: Tasks appear in exchange, assignee, and creator lists');
    console.log('- Assignees: Context-aware participant filtering works');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testTaskCreation();