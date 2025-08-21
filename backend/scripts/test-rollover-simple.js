#!/usr/bin/env node

/**
 * Simple test for task rollover without metadata column
 * Run with: node backend/scripts/test-rollover-simple.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const supabaseService = require('../services/supabase');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createTestTasks() {
  log('\n📋 Creating test tasks...', 'cyan');
  
  // Get a valid exchange ID
  const { data: exchanges } = await supabaseService.client
    .from('exchanges')
    .select('id')
    .limit(1);
  
  if (!exchanges || exchanges.length === 0) {
    log('❌ No exchanges found in database', 'red');
    return [];
  }
  
  const exchangeId = exchanges[0].id;
  log(`Using exchange ID: ${exchangeId}`, 'blue');
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  
  const testTasks = [
    {
      title: 'Overdue Task 1 - Should be rolled over',
      description: 'This task was due yesterday',
      status: 'PENDING',
      priority: 'HIGH',
      exchange_id: exchangeId,
      due_date: yesterday.toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      title: 'Overdue Task 2 - Should be rolled over',
      description: 'This task was due 3 days ago',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      exchange_id: exchangeId,
      due_date: threeDaysAgo.toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      title: 'Today Task - Should NOT be rolled over',
      description: 'This task is due today',
      status: 'PENDING',
      priority: 'LOW',
      exchange_id: exchangeId,
      due_date: today.toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];
  
  const created = [];
  for (const task of testTasks) {
    const { data, error } = await supabaseService.client
      .from('tasks')
      .insert([task])
      .select()
      .single();
    
    if (error) {
      log(`  ❌ Failed to create: ${task.title}`, 'red');
      console.error(error);
    } else {
      created.push(data);
      log(`  ✅ Created: ${task.title} (due: ${task.due_date})`, 'green');
    }
  }
  
  return created;
}

async function testSimpleRollover() {
  log('\n🔄 Testing Simple Rollover (without metadata)', 'bright');
  log('=' .repeat(50), 'cyan');
  
  const today = new Date().toISOString().split('T')[0];
  
  try {
    // Get overdue tasks
    const { data: overdueTasks, error: fetchError } = await supabaseService.client
      .from('tasks')
      .select('id, title, due_date, status')
      .in('status', ['PENDING', 'IN_PROGRESS'])
      .lt('due_date', today)
      .order('due_date');
    
    if (fetchError) {
      log(`❌ Error fetching overdue tasks: ${fetchError.message}`, 'red');
      return;
    }
    
    log(`\nFound ${overdueTasks?.length || 0} overdue tasks`, 'yellow');
    
    if (overdueTasks && overdueTasks.length > 0) {
      log('\nRolling over tasks to today...', 'cyan');
      
      for (const task of overdueTasks) {
        const { error: updateError } = await supabaseService.client
          .from('tasks')
          .update({
            due_date: today,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);
        
        if (updateError) {
          log(`  ❌ Failed to rollover: ${task.title}`, 'red');
        } else {
          log(`  ✅ Rolled over: ${task.title} (was due: ${task.due_date})`, 'green');
        }
      }
      
      // Verify the rollover
      log('\n📊 Verifying rollover...', 'cyan');
      const { data: verifyTasks } = await supabaseService.client
        .from('tasks')
        .select('id, title, due_date')
        .in('id', overdueTasks.map(t => t.id));
      
      verifyTasks?.forEach(task => {
        if (task.due_date === today) {
          log(`  ✓ ${task.title} is now due: ${task.due_date}`, 'green');
        } else {
          log(`  ✗ ${task.title} still due: ${task.due_date}`, 'red');
        }
      });
    }
    
    log('\n✅ Simple rollover test completed!', 'bright');
    
  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
    console.error(error);
  }
}

async function cleanup(taskIds) {
  if (!taskIds || taskIds.length === 0) return;
  
  log('\n🧹 Cleaning up test tasks...', 'cyan');
  
  for (const task of taskIds) {
    await supabaseService.client
      .from('tasks')
      .delete()
      .eq('id', task.id);
  }
  
  log('  ✅ Cleanup complete', 'green');
}

async function testCronJobStatus() {
  log('\n⏰ Checking Cron Job Configuration', 'bright');
  log('=' .repeat(50), 'cyan');
  
  log(`  ENABLE_TASK_ROLLOVER: ${process.env.ENABLE_TASK_ROLLOVER || 'not set'}`, 'yellow');
  log(`  TASK_ROLLOVER_SCHEDULE: ${process.env.TASK_ROLLOVER_SCHEDULE || 'not set'}`, 'yellow');
  
  if (process.env.ENABLE_TASK_ROLLOVER === 'true') {
    log('  ✅ Task rollover is ENABLED', 'green');
    log(`  📅 Schedule: ${process.env.TASK_ROLLOVER_SCHEDULE || '0 0 * * * (default)'}`, 'blue');
    
    // Parse cron schedule
    const schedule = process.env.TASK_ROLLOVER_SCHEDULE || '0 0 * * *';
    if (schedule === '0 0 * * *') {
      log('  ⏰ Will run daily at midnight', 'cyan');
    }
  } else {
    log('  ⚠️  Task rollover is DISABLED', 'yellow');
    log('  Set ENABLE_TASK_ROLLOVER=true in .env to enable', 'yellow');
  }
}

// Main test runner
async function runTests() {
  log('\n🚀 TASK ROLLOVER TEST (SIMPLE VERSION)', 'bright');
  log('=' .repeat(50), 'bright');
  
  let createdTasks = [];
  
  try {
    // Check cron job configuration
    await testCronJobStatus();
    
    // Create test tasks
    createdTasks = await createTestTasks();
    
    if (createdTasks.length > 0) {
      // Run the rollover test
      await testSimpleRollover();
    }
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
  } finally {
    // Cleanup
    await cleanup(createdTasks);
    log('\n👋 Test complete!', 'cyan');
    process.exit(0);
  }
}

// Run the tests
runTests();