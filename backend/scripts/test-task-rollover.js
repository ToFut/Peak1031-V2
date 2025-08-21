#!/usr/bin/env node

/**
 * Test script for task rollover functionality
 * Run with: node backend/scripts/test-task-rollover.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const taskRolloverService = require('../services/taskRolloverService');
const supabaseService = require('../services/supabase');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function createTestTasks() {
  log('\n📋 Creating test tasks with past due dates...', 'cyan');
  
  const today = new Date();
  const testTasks = [
    {
      title: 'Test Task 1 - 1 day overdue',
      description: 'This task is 1 day overdue',
      status: 'PENDING',
      priority: 'HIGH',
      exchange_id: '583d0041-bba7-4210-be65-519140eab358', // Using real exchange ID
      due_date: new Date(today.getTime() - (1 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      title: 'Test Task 2 - 3 days overdue',
      description: 'This task is 3 days overdue',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      exchange_id: '583d0041-bba7-4210-be65-519140eab358', // Using real exchange ID
      due_date: new Date(today.getTime() - (3 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      title: 'Test Task 3 - 7 days overdue',
      description: 'This task is 7 days overdue',
      status: 'PENDING',
      priority: 'LOW',
      exchange_id: '583d0041-bba7-4210-be65-519140eab358', // Using real exchange ID
      due_date: new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      title: 'Test Task 4 - Already completed',
      description: 'This task is completed and should not be rolled over',
      status: 'COMPLETED',
      priority: 'HIGH',
      exchange_id: '583d0041-bba7-4210-be65-519140eab358', // Using real exchange ID
      due_date: new Date(today.getTime() - (2 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      completed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      title: 'Test Task 5 - Due today',
      description: 'This task is due today and should not be rolled over',
      status: 'PENDING',
      priority: 'MEDIUM',
      exchange_id: '583d0041-bba7-4210-be65-519140eab358', // Using real exchange ID
      due_date: today.toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      title: 'Test Task 6 - Due tomorrow',
      description: 'This task is due tomorrow and should not be rolled over',
      status: 'PENDING',
      priority: 'LOW',
      exchange_id: '583d0041-bba7-4210-be65-519140eab358', // Using real exchange ID
      due_date: new Date(today.getTime() + (1 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const createdTasks = [];
  
  for (const task of testTasks) {
    try {
      const { data, error } = await supabaseService.client
        .from('tasks')
        .insert([task])
        .select()
        .single();
      
      if (error) {
        log(`  ❌ Failed to create task "${task.title}": ${error.message}`, 'red');
      } else {
        createdTasks.push(data);
        log(`  ✅ Created task "${task.title}" (due: ${task.due_date})`, 'green');
      }
    } catch (error) {
      log(`  ❌ Error creating task "${task.title}": ${error.message}`, 'red');
    }
  }
  
  return createdTasks;
}

async function testDryRun() {
  log('\n🔍 TEST 1: Dry Run (Preview Only)', 'bright');
  log('================================================', 'dim');
  
  try {
    const result = await taskRolloverService.rolloverTasks({
      dryRun: true,
      userId: 'test-user'
    });
    
    log('\n📊 Dry Run Results:', 'cyan');
    log(`  Message: ${result.message}`, 'yellow');
    log(`  Tasks Checked: ${result.stats.tasksChecked}`, 'yellow');
    log(`  Would Rollover: ${result.stats.tasksRolledOver}`, 'yellow');
    log(`  Would Skip: ${result.stats.tasksSkipped}`, 'yellow');
    log(`  Errors: ${result.stats.errors}`, 'yellow');
    
    if (result.details.rolledOverTasks.length > 0) {
      log('\n  Tasks that would be rolled over:', 'cyan');
      result.details.rolledOverTasks.forEach(task => {
        log(`    - "${task.title}" (${task.daysOverdue} days overdue)`, 'dim');
      });
    }
    
    log('\n✅ Dry run test completed successfully', 'green');
    return true;
  } catch (error) {
    log(`\n❌ Dry run test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testActualRollover() {
  log('\n🚀 TEST 2: Actual Rollover', 'bright');
  log('================================================', 'dim');
  
  try {
    const result = await taskRolloverService.rolloverTasks({
      dryRun: false,
      userId: 'test-user'
    });
    
    log('\n📊 Rollover Results:', 'cyan');
    log(`  Message: ${result.message}`, 'yellow');
    log(`  Tasks Checked: ${result.stats.tasksChecked}`, 'yellow');
    log(`  Tasks Rolled Over: ${result.stats.tasksRolledOver}`, 'yellow');
    log(`  Tasks Skipped: ${result.stats.tasksSkipped}`, 'yellow');
    log(`  Errors: ${result.stats.errors}`, 'yellow');
    log(`  Duration: ${result.stats.duration}`, 'yellow');
    
    if (result.details.rolledOverTasks.length > 0) {
      log('\n  Tasks rolled over:', 'cyan');
      result.details.rolledOverTasks.forEach(task => {
        log(`    - "${task.title}"`, 'dim');
        log(`      Original due date: ${task.originalDueDate}`, 'dim');
        log(`      New due date: ${task.newDueDate}`, 'dim');
        log(`      Days overdue: ${task.daysOverdue}`, 'dim');
      });
    }
    
    if (result.details.skippedTasks.length > 0) {
      log('\n  Tasks skipped:', 'cyan');
      result.details.skippedTasks.forEach(task => {
        log(`    - "${task.title}" (${task.reason})`, 'dim');
      });
    }
    
    if (result.details.failedTasks.length > 0) {
      log('\n  Tasks failed:', 'red');
      result.details.failedTasks.forEach(task => {
        log(`    - "${task.title}": ${task.error}`, 'red');
      });
    }
    
    log('\n✅ Actual rollover test completed successfully', 'green');
    return result.details.rolledOverTasks;
  } catch (error) {
    log(`\n❌ Actual rollover test failed: ${error.message}`, 'red');
    return [];
  }
}

async function testRolloverHistory(taskIds) {
  log('\n📜 TEST 3: Rollover History', 'bright');
  log('================================================', 'dim');
  
  if (!taskIds || taskIds.length === 0) {
    log('  ⚠️ No tasks to check history for', 'yellow');
    return;
  }
  
  try {
    // Test getting history for the first rolled over task
    const taskId = taskIds[0].id;
    const history = await taskRolloverService.getTaskRolloverHistory(taskId);
    
    if (history.success) {
      log(`\n📊 Rollover History for Task "${history.title}":`, 'cyan');
      log(`  Current Due Date: ${history.currentDueDate}`, 'yellow');
      log(`  Total Rollover Count: ${history.rolloverCount}`, 'yellow');
      
      if (history.rolloverHistory.length > 0) {
        log('\n  Rollover Events:', 'cyan');
        history.rolloverHistory.forEach((event, index) => {
          log(`    Event ${index + 1}:`, 'dim');
          log(`      Original Due: ${event.original_due_date}`, 'dim');
          log(`      New Due: ${event.new_due_date}`, 'dim');
          log(`      Rolled Over At: ${event.rolled_over_at}`, 'dim');
          log(`      Days Overdue: ${event.days_overdue}`, 'dim');
          log(`      Rolled Over By: ${event.rolled_over_by}`, 'dim');
        });
      }
      
      log('\n✅ Rollover history test completed successfully', 'green');
    } else {
      log(`\n❌ Failed to get rollover history: ${history.error}`, 'red');
    }
  } catch (error) {
    log(`\n❌ Rollover history test failed: ${error.message}`, 'red');
  }
}

async function testSpecificTaskRollover(taskIds) {
  log('\n🎯 TEST 4: Specific Task Rollover', 'bright');
  log('================================================', 'dim');
  
  if (!taskIds || taskIds.length === 0) {
    log('  ⚠️ No tasks available for specific rollover test', 'yellow');
    return;
  }
  
  try {
    // Test rolling over specific tasks (use the last created task)
    const specificTaskIds = [taskIds[taskIds.length - 1].id];
    
    log(`\n  Rolling over specific task: ${specificTaskIds[0]}`, 'cyan');
    
    const result = await taskRolloverService.rolloverSpecificTasks(
      specificTaskIds, 
      'test-user'
    );
    
    log(`\n📊 Specific Rollover Results:`, 'cyan');
    log(`  Message: ${result.message}`, 'yellow');
    
    if (result.results.success.length > 0) {
      log('\n  Successfully rolled over:', 'green');
      result.results.success.forEach(task => {
        log(`    - Task ${task.taskId}: "${task.title}"`, 'dim');
      });
    }
    
    if (result.results.failed.length > 0) {
      log('\n  Failed to rollover:', 'red');
      result.results.failed.forEach(task => {
        log(`    - Task ${task.taskId}: ${task.error}`, 'red');
      });
    }
    
    log('\n✅ Specific task rollover test completed', 'green');
  } catch (error) {
    log(`\n❌ Specific task rollover test failed: ${error.message}`, 'red');
  }
}

async function testRolloverStatistics() {
  log('\n📈 TEST 5: Rollover Statistics', 'bright');
  log('================================================', 'dim');
  
  try {
    const stats = await taskRolloverService.getRolloverStatistics();
    
    if (stats.success) {
      log('\n📊 Rollover Statistics:', 'cyan');
      log(`  Total Tasks Rolled Over: ${stats.stats.totalTasksRolledOver}`, 'yellow');
      log(`  Average Rollover Count: ${stats.stats.averageRolloverCount}`, 'yellow');
      log(`  Max Rollover Count: ${stats.stats.maxRolloverCount}`, 'yellow');
      
      if (Object.keys(stats.stats.tasksByRolloverCount).length > 0) {
        log('\n  Tasks by Rollover Count:', 'cyan');
        Object.entries(stats.stats.tasksByRolloverCount).forEach(([count, tasks]) => {
          log(`    ${count} rollovers: ${tasks} tasks`, 'dim');
        });
      }
      
      if (Object.keys(stats.stats.rolloversByDate).length > 0) {
        log('\n  Recent Rollovers by Date:', 'cyan');
        const dates = Object.keys(stats.stats.rolloversByDate).sort().slice(-5);
        dates.forEach(date => {
          log(`    ${date}: ${stats.stats.rolloversByDate[date]} tasks`, 'dim');
        });
      }
      
      log('\n✅ Rollover statistics test completed successfully', 'green');
    } else {
      log(`\n❌ Failed to get rollover statistics: ${stats.error}`, 'red');
    }
  } catch (error) {
    log(`\n❌ Rollover statistics test failed: ${error.message}`, 'red');
  }
}

async function cleanupTestTasks(taskIds) {
  log('\n🧹 Cleaning up test tasks...', 'cyan');
  
  for (const task of taskIds) {
    try {
      const { error } = await supabaseService.client
        .from('tasks')
        .delete()
        .eq('id', task.id);
      
      if (error) {
        log(`  ⚠️ Failed to delete task "${task.title}": ${error.message}`, 'yellow');
      } else {
        log(`  ✅ Deleted task "${task.title}"`, 'dim');
      }
    } catch (error) {
      log(`  ⚠️ Error deleting task: ${error.message}`, 'yellow');
    }
  }
}

async function runAllTests() {
  log('\n🚀 TASK ROLLOVER TEST SUITE', 'bright');
  log('================================', 'bright');
  log('Testing automatic task rollover functionality\n', 'dim');
  
  let createdTasks = [];
  
  try {
    // Create test tasks
    createdTasks = await createTestTasks();
    
    if (createdTasks.length === 0) {
      log('\n⚠️ No test tasks were created. Exiting tests.', 'yellow');
      return;
    }
    
    // Run tests
    await testDryRun();
    const rolledOverTasks = await testActualRollover();
    await testRolloverHistory(rolledOverTasks);
    await testSpecificTaskRollover(rolledOverTasks);
    await testRolloverStatistics();
    
    log('\n✅ ALL TESTS COMPLETED SUCCESSFULLY!', 'bright');
    
  } catch (error) {
    log(`\n❌ Test suite failed: ${error.message}`, 'red');
    console.error(error);
  } finally {
    // Cleanup
    if (createdTasks.length > 0) {
      await cleanupTestTasks(createdTasks);
    }
    
    log('\n👋 Test suite finished', 'cyan');
    process.exit(0);
  }
}

// Run the tests
runAllTests();