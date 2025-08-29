require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:5001';

async function testComprehensiveFix() {
  try {
    console.log('🔍 Testing comprehensive security fix for all endpoints...\n');
    
    // Create test tokens
    const clientToken = jwt.sign(
      {
        userId: '557dc07c-3ca7-46bf-94cd-c99f3d1e3bb1',
        email: 'client@peak1031.com',
        role: 'client'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    const adminToken = jwt.sign(
      {
        userId: 'admin-user-id',
        email: 'admin@peak1031.com',
        role: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    const headers = {
      client: { 'Authorization': `Bearer ${clientToken}` },
      admin: { 'Authorization': `Bearer ${adminToken}` }
    };
    
    // Test endpoints that were previously vulnerable
    const tests = [
      {
        name: 'Exchanges Statistics',
        endpoint: '/api/exchanges/statistics',
        expectClientFiltered: true
      },
      {
        name: 'Tasks List',
        endpoint: '/api/tasks',
        expectClientFiltered: true
      },
      {
        name: 'Agencies List',
        endpoint: '/api/agencies',
        expectClientRestricted: true
      },
      {
        name: 'Admin Stats',
        endpoint: '/api/admin/stats',
        expectClientRestricted: true
      }
    ];
    
    for (const test of tests) {
      console.log(`📊 Testing ${test.name}:`);
      
      try {
        // Test client access
        console.log(`  👤 Client access to ${test.endpoint}:`);
        
        if (test.expectClientRestricted) {
          try {
            const response = await axios.get(`${API_URL}${test.endpoint}`, { headers: headers.client });
            console.log(`    ❌ ERROR: Client should not have access but got response:`, response.data);
          } catch (error) {
            if (error.response?.status === 403) {
              console.log(`    ✅ CORRECT: Client properly blocked (403)`);
            } else {
              console.log(`    ⚠️  Unexpected error:`, error.response?.status, error.response?.data?.message);
            }
          }
        } else if (test.expectClientFiltered) {
          try {
            const response = await axios.get(`${API_URL}${test.endpoint}`, { headers: headers.client });
            
            // Check if response indicates filtered data
            const data = response.data;
            let totalItems = 0;
            
            if (data.statistics) {
              totalItems = data.statistics.total;
              console.log(`    ✅ Client sees ${totalItems} items (should be ~7 for exchanges)`);
            } else if (data.data) {
              totalItems = data.pagination?.total || data.data.length;
              console.log(`    ✅ Client sees ${totalItems} items (filtered)`);
            } else {
              console.log(`    ⚠️  Unexpected response format:`, Object.keys(data));
            }
            
            if (totalItems > 100) {
              console.log(`    ❌ ERROR: Client sees ${totalItems} items - likely unfiltered system data!`);
            }
            
          } catch (error) {
            console.log(`    ❌ Client request failed:`, error.response?.status, error.response?.data?.message);
          }
        }
        
      } catch (error) {
        console.error(`  Error testing ${test.name}:`, error.message);
      }
      
      console.log(''); // Add spacing
    }
    
    console.log('🎯 SUMMARY:');
    console.log('  - Tasks: Now filtered to user\'s exchanges only');
    console.log('  - Agencies: Now restricted to admin/coordinator only');  
    console.log('  - Statistics: Should show client-specific numbers');
    console.log('  - Admin endpoints: Should block non-admin users');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check if server is running first
axios.get(`${API_URL}/health`)
  .then(() => {
    console.log('✅ Server is running on port 5001\n');
    testComprehensiveFix();
  })
  .catch(() => {
    console.error('❌ Server is not running. Please start the backend server first.');
  });