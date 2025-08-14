#!/usr/bin/env node

/**
 * Test the exact frontend workflow to identify the root cause
 */

require('dotenv').config();
const axios = require('axios');

async function testCompleteWorkflow() {
  console.log('🔍 COMPLETE FRONTEND WORKFLOW TEST');
  console.log('==================================\n');

  const exchangeId = 'df7ea956-a936-45c6-b683-143e9dda5230';
  
  try {
    console.log('📡 Step 1: Test the exact API call the frontend makes');
    console.log('URL: http://localhost:5001/api/exchanges/' + exchangeId + '/tasks\n');
    
    const response = await axios.get(`http://localhost:5001/api/exchanges/${exchangeId}/tasks`);
    
    console.log('✅ API Response Status:', response.status);
    console.log('📦 Response Content-Type:', response.headers['content-type']);
    console.log('📊 Response Structure:');
    console.log('  - Has tasks property:', 'tasks' in response.data);
    console.log('  - Tasks count:', response.data.tasks?.length || 0);
    console.log('  - Is array:', Array.isArray(response.data.tasks));
    
    if (response.data.tasks?.length > 0) {
      console.log('\n📋 Tasks Details:');
      response.data.tasks.forEach((task, i) => {
        console.log(`  ${i+1}. "${task.title}"`);
        console.log(`     - ID: ${task.id}`);
        console.log(`     - Status: "${task.status}" (${typeof task.status})`);
        console.log(`     - Priority: "${task.priority}"`);
        console.log(`     - Exchange ID: ${task.exchange_id}`);
        console.log(`     - Assigned to: ${task.assigned_to || 'None'}`);
        console.log(`     - Created by: ${task.created_by || 'None'}`);
        console.log();
      });
    }
    
    console.log('🔄 Step 2: Simulate frontend data extraction');
    const extractedTasks = response.data?.tasks || response.data || [];
    console.log('Frontend extraction result:', extractedTasks.length, 'tasks');
    
    console.log('\n🎯 Step 3: Simulate TaskBoard filtering logic');
    const columns = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    
    columns.forEach(status => {
      const normalizeStatus = (taskStatus) => {
        const statusMap = {
          'pending': 'PENDING',
          'in_progress': 'IN_PROGRESS',
          'completed': 'COMPLETED',
          'PENDING': 'PENDING', 
          'IN_PROGRESS': 'IN_PROGRESS',
          'COMPLETED': 'COMPLETED'
        };
        return statusMap[taskStatus] || 'PENDING';
      };
      
      const filtered = extractedTasks.filter(task => {
        const normalizedTaskStatus = normalizeStatus(task.status);
        const normalizedColumnStatus = normalizeStatus(status);
        return normalizedTaskStatus === normalizedColumnStatus;
      });
      
      console.log(`  Column "${status}": ${filtered.length} tasks`);
      if (filtered.length > 0) {
        filtered.forEach(task => {
          console.log(`    - "${task.title}" (${task.status})`);
        });
      }
    });
    
    console.log('\n🔍 Step 4: Check render condition');
    const renderCondition = Array.isArray(extractedTasks) && extractedTasks.length > 0;
    console.log('Array.isArray(tasks):', Array.isArray(extractedTasks));
    console.log('tasks.length:', extractedTasks.length);
    console.log('tasks.length > 0:', extractedTasks.length > 0);
    console.log('Final render condition:', renderCondition);
    console.log('Should show TaskBoard:', renderCondition ? 'YES' : 'NO - Will show "No Tasks Yet"');
    
  } catch (error) {
    console.error('❌ Error in workflow test:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }

  process.exit(0);
}

// Run the test
testCompleteWorkflow();