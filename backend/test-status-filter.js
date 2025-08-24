#!/usr/bin/env node

const fetch = require('node-fetch');

async function testStatusFilter() {
  const baseUrl = 'http://localhost:5001/api';
  
  // Get a token for testing (using client account)
  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'admin@peak1031.com',
      password: 'admin123'
    })
  });
  
  const loginData = await loginResponse.json();
  const token = loginData.token;
  
  console.log('🔑 Logged in as admin');
  
  // Test 1: Get all exchanges (no filter)
  console.log('\n📋 Test 1: Get all exchanges (no filter)');
  const allResponse = await fetch(`${baseUrl}/exchanges?limit=5`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const allData = await allResponse.json();
  console.log(`   ✅ Got ${allData.exchanges?.length || 0} exchanges`);
  console.log(`   📊 Total: ${allData.pagination?.totalItems || 'N/A'}`);
  
  // Test 2: Filter by status = 'active'
  console.log('\n📋 Test 2: Filter by status = "active"');
  const activeResponse = await fetch(`${baseUrl}/exchanges?status=active&limit=5`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const activeData = await activeResponse.json();
  console.log(`   ✅ Got ${activeData.exchanges?.length || 0} active exchanges`);
  console.log(`   📊 Total active: ${activeData.pagination?.totalItems || 'N/A'}`);
  
  // Test 3: Filter by status = 'completed'
  console.log('\n📋 Test 3: Filter by status = "completed"');
  const completedResponse = await fetch(`${baseUrl}/exchanges?status=completed&limit=5`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const completedData = await completedResponse.json();
  console.log(`   ✅ Got ${completedData.exchanges?.length || 0} completed exchanges`);
  console.log(`   📊 Total completed: ${completedData.pagination?.totalItems || 'N/A'}`);
  
  // Test 4: Check backend filtering statistics
  console.log('\n📋 Test 4: Check statistics endpoint');
  const statsResponse = await fetch(`${baseUrl}/exchanges/statistics`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const statsData = await statsResponse.json();
  console.log(`   📊 Statistics:`, {
    total: statsData.statistics?.total,
    active: statsData.statistics?.active,
    completed: statsData.statistics?.completed,
    pending: statsData.statistics?.pending
  });
}

testStatusFilter().catch(console.error);