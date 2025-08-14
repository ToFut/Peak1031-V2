#!/usr/bin/env node

/**
 * Test script for debugging exchange tasks endpoint
 */

require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

async function testExchangeTasks() {
  console.log('🧪 Testing Exchange Tasks Endpoint');
  console.log('===================================\n');

  // Create a test token
  const token = jwt.sign(
    {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin'
    },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );

  // Test exchange ID that has tasks
  const exchangeId = 'df7ea956-a936-45c6-b683-143e9dda5230';
  
  try {
    // Test 1: Direct API call with authentication
    console.log('📡 Test 1: Calling /api/exchanges/:id/tasks with auth token...');
    const response = await axios.get(
      `http://localhost:5001/api/exchanges/${exchangeId}/tasks`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Response status:', response.status);
    console.log('📦 Response data:', JSON.stringify(response.data, null, 2));
    console.log('📊 Tasks count:', response.data.tasks?.length || 0);
    
    if (response.data.tasks && response.data.tasks.length > 0) {
      console.log('\n📋 First task details:');
      console.log('  - Title:', response.data.tasks[0].title);
      console.log('  - Status:', response.data.tasks[0].status);
      console.log('  - Priority:', response.data.tasks[0].priority);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.status || error.message);
    console.error('Error details:', error.response?.data || error.message);
  }

  // Test 2: Direct database query for comparison
  console.log('\n📡 Test 2: Direct database query for comparison...');
  const supabase = require('./services/supabase');
  
  const { data: dbTasks, error: dbError } = await supabase.client
    .from('tasks')
    .select('*')
    .eq('exchange_id', exchangeId);
  
  if (dbError) {
    console.error('❌ Database error:', dbError);
  } else {
    console.log('✅ Tasks in database:', dbTasks?.length || 0);
    if (dbTasks && dbTasks.length > 0) {
      console.log('📋 Database task titles:', dbTasks.map(t => t.title));
    }
  }

  process.exit(0);
}

// Run the test
testExchangeTasks();