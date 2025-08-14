#!/usr/bin/env node

/**
 * Debug frontend task issue - trace the complete data flow
 */

require('dotenv').config();
const axios = require('axios');

async function debugFrontendTasks() {
  console.log('🔍 FRONTEND TASK DEBUG - COMPLETE DATA FLOW TRACE');
  console.log('===================================================\n');

  // Test exchange ID that has tasks
  const exchangeId = 'df7ea956-a936-45c6-b683-143e9dda5230';
  
  try {
    console.log('📡 Step 1: Test API endpoint without auth (as frontend does)');
    console.log('URL: http://localhost:5001/api/exchanges/' + exchangeId + '/tasks');
    
    const response = await axios.get(
      `http://localhost:5001/api/exchanges/${exchangeId}/tasks`,
      {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Response Status:', response.status);
    console.log('📦 Response Headers:', response.headers['content-type']);
    console.log('📊 Raw Response Keys:', Object.keys(response.data));
    console.log('📋 Full Response Structure:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Check if it has the expected structure
    if (response.data.tasks) {
      console.log('\n✅ Has "tasks" property');
      console.log('📊 Tasks count:', response.data.tasks.length);
      
      if (response.data.tasks.length > 0) {
        console.log('\n📋 First task structure:');
        console.log('- ID:', response.data.tasks[0].id);
        console.log('- Title:', response.data.tasks[0].title);
        console.log('- Status:', response.data.tasks[0].status, '(type:', typeof response.data.tasks[0].status, ')');
        console.log('- Priority:', response.data.tasks[0].priority);
        console.log('- Exchange ID:', response.data.tasks[0].exchange_id);
        console.log('- Created At:', response.data.tasks[0].created_at);
        
        console.log('\n📊 All task statuses:');
        response.data.tasks.forEach((task, i) => {
          console.log(`  ${i+1}. "${task.title}" - Status: "${task.status}" (${typeof task.status})`);
        });
      }
    } else if (Array.isArray(response.data)) {
      console.log('\n⚠️  Response is direct array (not wrapped in tasks property)');
      console.log('📊 Array length:', response.data.length);
      
      if (response.data.length > 0) {
        console.log('📋 First item structure:');
        console.log(JSON.stringify(response.data[0], null, 2));
      }
    } else {
      console.log('\n❌ Unexpected response structure');
    }
    
    console.log('\n📡 Step 2: Test what frontend apiService.get() would receive');
    
    // Simulate the frontend extraction logic
    const frontendExtraction1 = response.data?.tasks || response.data || [];
    console.log('Frontend extraction (tasksData?.tasks || tasksData || []):', frontendExtraction1.length, 'items');
    
    // Test the TaskBoard filtering logic
    if (frontendExtraction1.length > 0) {
      console.log('\n🎯 Step 3: Test TaskBoard filtering logic');
      
      const testStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'pending', 'in_progress', 'completed'];
      
      testStatuses.forEach(status => {
        const filtered = frontendExtraction1.filter(task => {
          const taskStatus = task.status?.toUpperCase();
          return taskStatus === status.toUpperCase();
        });
        console.log(`  Status "${status}":`, filtered.length, 'tasks');
      });
      
      console.log('\n📊 All unique statuses in data:');
      const uniqueStatuses = [...new Set(frontendExtraction1.map(t => t.status))];
      console.log('  Unique statuses:', uniqueStatuses);
    }

  } catch (error) {
    console.error('❌ Error:', error.code || error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else if (error.request) {
      console.error('No response received');
      console.error('Request details:', error.request);
    } else {
      console.error('Error details:', error.message);
    }
  }

  // Also test direct database query for comparison
  console.log('\n📡 Step 4: Compare with direct database query');
  const supabase = require('./services/supabase');
  
  const { data: dbTasks, error: dbError } = await supabase.client
    .from('tasks')
    .select('*')
    .eq('exchange_id', exchangeId);
  
  if (dbError) {
    console.error('❌ Database error:', dbError);
  } else {
    console.log('✅ Direct DB query - Tasks found:', dbTasks?.length || 0);
    if (dbTasks && dbTasks.length > 0) {
      console.log('📋 DB task statuses:', dbTasks.map(t => `"${t.status}"`));
    }
  }

  process.exit(0);
}

// Run the debug
debugFrontendTasks();