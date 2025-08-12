/**
 * Test analytics endpoints to see what's not working
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const testAnalyticsEndpoints = async () => {
  try {
    console.log('🧪 Testing analytics endpoints...');
    
    // Create admin JWT token
    const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
    const adminToken = jwt.sign(
      {
        userId: adminUserId,
        id: adminUserId,
        email: 'admin@peak1031.com',
        role: 'admin',
        contact_id: adminUserId
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const baseURL = 'http://localhost:5001/api/analytics';
    
    // Test endpoints
    const endpoints = [
      '/financial-overview',
      '/dashboard-stats',
      '/classic-queries',
      '/query-suggestions'
    ];
    
    for (const endpoint of endpoints) {
      console.log(`\n📊 Testing ${endpoint}...`);
      
      try {
        const response = await fetch(`${baseURL}${endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`- Status: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`- Success: ${data.success}`);
          if (data.data) {
            if (typeof data.data === 'object' && data.data !== null) {
              console.log(`- Data keys: ${Object.keys(data.data).slice(0, 5).join(', ')}`);
              if (endpoint === '/dashboard-stats') {
                console.log(`- Total exchanges: ${data.data.exchanges?.total || 0}`);
                console.log(`- Total value: ${data.data.financial?.totalValue || 0}`);
              }
            } else {
              console.log(`- Data type: ${typeof data.data}`);
            }
          } else {
            console.log('- No data field in response');
          }
        } else {
          const errorText = await response.text();
          console.log(`- Error: ${errorText}`);
        }
      } catch (fetchError) {
        console.log(`- Fetch Error: ${fetchError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testAnalyticsEndpoints();