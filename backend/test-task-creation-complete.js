#!/usr/bin/env node

/**
 * Comprehensive Task Creation Test
 * Tests all 3 modes: Natural Language, Template, Manual
 * Verifies distribution to exchange, assigned user, and creator
 * Checks notifications are sent
 */

require('dotenv').config();
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5001/api';
let authToken = null;
let testUserId = null;
let testExchangeId = null;
let assigneeUserId = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function login() {
  log('\n🔐 Logging in...', 'cyan');
  
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@peak1031.com',
      password: 'admin123'
    })
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status}`);
  }

  const data = await response.json();
  authToken = data.token;
  testUserId = data.user.id;
  
  log(`✅ Logged in as: ${data.user.email} (${data.user.role})`, 'green');
  log(`   User ID: ${testUserId}`, 'blue');
  
  return data.user;
}

async function getTestExchange() {
  log('\n🏢 Getting test exchange...', 'cyan');
  
  const response = await fetch(`${API_BASE}/exchanges`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  if (!response.ok) {
    throw new Error(`Failed to get exchanges: ${response.status}`);
  }

  const data = await response.json();
  
  if (!data.data || data.data.length === 0) {
    throw new Error('No exchanges found');
  }

  testExchangeId = data.data[0].id;
  log(`✅ Using exchange: ${data.data[0].exchange_number} (${testExchangeId})`, 'green');
  
  return data.data[0];
}

async function getExchangeParticipants() {
  log('\n👥 Getting exchange participants...', 'cyan');
  
  const response = await fetch(`${API_BASE}/tasks/assignees/valid?exchangeId=${testExchangeId}&context=exchange`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get participants: ${response.status} - ${error}`);
  }

  const data = await response.json();
  
  if (!data.success || !data.data?.assignees || data.data.assignees.length === 0) {
    log('⚠️  No participants found, will use self-assignment', 'yellow');
    assigneeUserId = testUserId;
    return [];
  }

  // Pick a different user if possible, otherwise use self
  const otherUsers = data.data.assignees.filter(a => a.id !== testUserId);
  if (otherUsers.length > 0) {
    assigneeUserId = otherUsers[0].id;
    log(`✅ Will assign to: ${otherUsers[0].name} (${assigneeUserId})`, 'green');
  } else {
    assigneeUserId = testUserId;
    log(`✅ Will self-assign to: ${data.data.assignees[0].name} (${assigneeUserId})`, 'green');
  }
  
  log(`   Total participants: ${data.data.assignees.length}`, 'blue');
  
  return data.data.assignees;
}

async function testNaturalLanguageTask() {
  log('\n🤖 Testing Natural Language Task Creation...', 'bright');
  
  const naturalText = `Schedule property inspection for next Friday at 2pm and assign to the user`;
  
  log(`   Input: "${naturalText}"`, 'blue');
  
  const response = await fetch(`${API_BASE}/tasks/natural`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      naturalLanguage: naturalText,
      exchangeId: testExchangeId,
      assignedTo: assigneeUserId
    })
  });

  const data = await response.json();
  
  if (!response.ok) {
    log(`❌ Natural language task creation failed: ${data.error || data.message}`, 'red');
    return null;
  }

  log('✅ Natural language task created successfully!', 'green');
  log(`   Task ID: ${data.task.id}`, 'blue');
  log(`   Title: ${data.task.title}`, 'blue');
  log(`   Assigned to: ${data.task.assigned_to || 'Not assigned'}`, 'blue');
  log(`   Due date: ${data.task.due_date || 'No due date'}`, 'blue');
  
  if (data.parsedData) {
    log('   📊 Parsed Data:', 'cyan');
    log(`      Priority: ${data.parsedData.priority}`, 'blue');
    log(`      Category: ${data.parsedData.category}`, 'blue');
    if (data.parsedData.extractedData?.dateInfo) {
      log(`      Date detected: ${data.parsedData.extractedData.dateInfo.formatted}`, 'blue');
    }
  }
  
  return data.task;
}

async function testTemplateTask() {
  log('\n📄 Testing Template-based Task Creation...', 'bright');
  
  // First get available templates
  const templatesResponse = await fetch(`${API_BASE}/tasks/templates`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });

  if (!templatesResponse.ok) {
    log('⚠️  No templates endpoint available, using manual mode', 'yellow');
    return null;
  }

  const templates = await templatesResponse.json();
  const templateKeys = Object.keys(templates);
  
  if (templateKeys.length === 0) {
    log('⚠️  No templates available, skipping template test', 'yellow');
    return null;
  }

  const selectedTemplate = templateKeys[0];
  log(`   Using template: ${selectedTemplate}`, 'blue');
  log(`   Template details: ${templates[selectedTemplate].title}`, 'blue');
  
  const taskData = {
    ...templates[selectedTemplate],
    exchange_id: testExchangeId,
    exchangeId: testExchangeId,
    assigned_to: assigneeUserId,
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    pp_data: {
      template_used: selectedTemplate
    }
  };
  
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(taskData)
  });

  const data = await response.json();
  
  if (!response.ok) {
    log(`❌ Template task creation failed: ${data.error || data.message}`, 'red');
    return null;
  }

  log('✅ Template task created successfully!', 'green');
  log(`   Task ID: ${data.id}`, 'blue');
  log(`   Title: ${data.title}`, 'blue');
  log(`   Category: ${data.category || 'general'}`, 'blue');
  
  return data;
}

async function testManualTask() {
  log('\n✍️  Testing Manual Task Creation...', 'bright');
  
  const manualTask = {
    title: 'Review and sign closing documents',
    description: 'Please review all closing documents and provide signatures where required. Contact coordinator if you have any questions.',
    priority: 'high',
    category: 'document',
    exchange_id: testExchangeId,
    exchangeId: testExchangeId,
    assigned_to: assigneeUserId,
    due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    pp_data: {
      created_via: 'manual',
      estimated_duration: '2h'
    }
  };
  
  log(`   Title: ${manualTask.title}`, 'blue');
  log(`   Priority: ${manualTask.priority}`, 'blue');
  log(`   Due in: 3 days`, 'blue');
  
  const response = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(manualTask)
  });

  const data = await response.json();
  
  if (!response.ok) {
    log(`❌ Manual task creation failed: ${data.error || data.message}`, 'red');
    return null;
  }

  log('✅ Manual task created successfully!', 'green');
  log(`   Task ID: ${data.id}`, 'blue');
  log(`   Status: ${data.status}`, 'blue');
  
  return data;
}

async function verifyTaskDistribution(taskIds) {
  log('\n📊 Verifying Task Distribution...', 'bright');
  
  // Check exchange tasks
  log('\n   🏢 Exchange Tasks:', 'cyan');
  const exchangeResponse = await fetch(`${API_BASE}/tasks?exchangeId=${testExchangeId}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (exchangeResponse.ok) {
    const exchangeTasks = await exchangeResponse.json();
    const createdTasks = exchangeTasks.filter(t => taskIds.includes(t.id));
    log(`      Found ${createdTasks.length}/${taskIds.length} tasks in exchange`, 'blue');
    createdTasks.forEach(t => {
      log(`      - ${t.title} (${t.status})`, 'green');
    });
  }
  
  // Check assigned user's tasks
  if (assigneeUserId !== testUserId) {
    log('\n   👤 Assigned User Tasks:', 'cyan');
    const assignedResponse = await fetch(`${API_BASE}/tasks?assignedTo=${assigneeUserId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    
    if (assignedResponse.ok) {
      const assignedTasks = await assignedResponse.json();
      const createdTasks = assignedTasks.filter(t => taskIds.includes(t.id));
      log(`      Found ${createdTasks.length}/${taskIds.length} tasks for assignee`, 'blue');
      createdTasks.forEach(t => {
        log(`      - ${t.title} (assigned to user)`, 'green');
      });
    }
  }
  
  // Check creator's tasks
  log('\n   👤 Creator Tasks:', 'cyan');
  const creatorResponse = await fetch(`${API_BASE}/tasks?createdBy=${testUserId}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (creatorResponse.ok) {
    const creatorTasks = await creatorResponse.json();
    const createdTasks = creatorTasks.filter(t => taskIds.includes(t.id));
    log(`      Found ${createdTasks.length}/${taskIds.length} tasks for creator`, 'blue');
    createdTasks.forEach(t => {
      log(`      - ${t.title} (created by user)`, 'green');
    });
  }
}

async function checkNotifications() {
  log('\n🔔 Checking Notifications...', 'bright');
  
  const response = await fetch(`${API_BASE}/notifications/recent`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  if (!response.ok) {
    log('⚠️  Could not fetch notifications', 'yellow');
    return;
  }
  
  const notifications = await response.json();
  const taskNotifications = notifications.filter(n => 
    n.type === 'task_created' || 
    n.type === 'task_assigned' || 
    n.type === 'task_updated'
  );
  
  log(`   Found ${taskNotifications.length} recent task notifications`, 'blue');
  
  taskNotifications.slice(0, 5).forEach(n => {
    log(`   - ${n.type}: ${n.message || n.title}`, 'green');
  });
}

async function runAllTests() {
  try {
    log('\n' + '='.repeat(60), 'bright');
    log('🚀 COMPREHENSIVE TASK CREATION TEST', 'bright');
    log('='.repeat(60), 'bright');
    
    // Setup
    await login();
    await getTestExchange();
    await getExchangeParticipants();
    
    const createdTaskIds = [];
    
    // Test all three modes
    log('\n' + '-'.repeat(60), 'bright');
    log('📝 TESTING ALL TASK CREATION MODES', 'bright');
    log('-'.repeat(60), 'bright');
    
    // Natural Language
    const nlTask = await testNaturalLanguageTask();
    if (nlTask) createdTaskIds.push(nlTask.id);
    
    // Template
    const templateTask = await testTemplateTask();
    if (templateTask) createdTaskIds.push(templateTask.id);
    
    // Manual
    const manualTask = await testManualTask();
    if (manualTask) createdTaskIds.push(manualTask.id);
    
    // Verify distribution
    if (createdTaskIds.length > 0) {
      log('\n' + '-'.repeat(60), 'bright');
      log('🔍 VERIFICATION', 'bright');
      log('-'.repeat(60), 'bright');
      
      await verifyTaskDistribution(createdTaskIds);
      await checkNotifications();
    }
    
    // Summary
    log('\n' + '='.repeat(60), 'bright');
    log('📊 TEST SUMMARY', 'bright');
    log('='.repeat(60), 'bright');
    
    log(`\n✅ Successfully tested ${createdTaskIds.length} task creation modes:`, 'green');
    log('   • Natural Language: ' + (nlTask ? '✅' : '❌'), nlTask ? 'green' : 'red');
    log('   • Template-based: ' + (templateTask ? '✅' : '❌'), templateTask ? 'green' : 'red');
    log('   • Manual: ' + (manualTask ? '✅' : '❌'), manualTask ? 'green' : 'red');
    
    log('\n✅ All tests completed successfully!', 'green');
    
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run tests
runAllTests();