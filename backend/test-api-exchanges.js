#!/usr/bin/env node

/**
 * Test the API endpoint for different roles
 */

require('dotenv').config();
const jwt = require('jsonwebtoken');

async function testAPIExchanges() {
  console.log('🧪 Testing API /exchanges endpoint for different roles\n');
  console.log('=' .repeat(70));
  
  const baseURL = 'http://localhost:5001/api';
  
  // Create test tokens for different roles
  const testUsers = [
    {
      role: 'coordinator',
      email: 'coordinator@peak1031.com',
      id: '12bbeccd-4c85-43ac-8bcf-bfe73fee3525',
      contact_id: '6c025471-4c45-4328-820d-804eed3229dd'
    },
    {
      role: 'agency',
      email: 'agency@peak1031.com',
      id: 'dcd1d389-55ed-4091-b6e2-366e9c01dc03',
      contact_id: '92297c5b-b445-4663-bad9-17501cef0a28'
    },
    {
      role: 'third_party',
      email: 'thirdparty1@peak1031.com',
      id: '0772aa76-81ff-49fa-8d64-cf354a60cca1',
      contact_id: 'c73b20ef-735e-47dd-b853-5e2d6aa0117d'
    },
    {
      role: 'client',
      email: 'client@peak1031.com',
      id: '8623d420-9c6b-479e-b185-6abd30ddd57c',
      contact_id: '8623d420-9c6b-479e-b185-6abd30ddd57c'
    }
  ];
  
  for (const user of testUsers) {
    console.log(`\n📋 Testing ${user.role.toUpperCase()} (${user.email})\n`);
    
    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        contact_id: user.contact_id
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    try {
      // Make API request
      const response = await fetch(`${baseURL}/exchanges?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log(`  ❌ HTTP ${response.status}: ${response.statusText}`);
        const errorText = await response.text();
        console.log(`  Error: ${errorText.substring(0, 200)}`);
        continue;
      }
      
      const data = await response.json();
      
      // Check if we got exchanges
      const exchanges = data.exchanges || data;
      const exchangeCount = Array.isArray(exchanges) ? exchanges.length : 0;
      
      console.log(`  ✅ Response received`);
      console.log(`  📊 Exchanges returned: ${exchangeCount}`);
      
      if (exchangeCount > 0) {
        console.log(`  Examples:`);
        exchanges.slice(0, 3).forEach(ex => {
          console.log(`    - ${ex.name || ex.exchangeNumber || ex.exchange_number}`);
        });
      } else {
        console.log(`  ⚠️ No exchanges returned`);
      }
      
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(70));
  console.log('📊 TEST COMPLETE\n');
  console.log('If some roles show 0 exchanges, check:');
  console.log('1. Backend server is running (npm run dev:backend)');
  console.log('2. Database changes are applied');
  console.log('3. Participant records have user_id set');
}

// Run the test
testAPIExchanges();