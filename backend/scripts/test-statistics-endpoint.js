require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');

const API_URL = 'http://localhost:5001';

async function testStatisticsEndpoint() {
  try {
    console.log('🔍 Testing /api/exchanges/statistics endpoint...\n');
    
    // Create a test token for client@peak1031.com
    const clientToken = jwt.sign(
      {
        userId: '557dc07c-3ca7-46bf-94cd-c99f3d1e3bb1',
        email: 'client@peak1031.com',
        role: 'client'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    // Test client statistics
    console.log('📊 Testing client statistics:');
    try {
      const response = await axios.get(`${API_URL}/api/exchanges/statistics`, {
        headers: {
          'Authorization': `Bearer ${clientToken}`
        }
      });
      
      console.log('  Response:', response.data);
      
      if (response.data.statistics) {
        const stats = response.data.statistics;
        console.log('  Statistics received:');
        console.log(`    - Total: ${stats.total}`);
        console.log(`    - Active: ${stats.active}`);
        console.log(`    - Completed: ${stats.completed}`);
        console.log(`    - Pending: ${stats.pending}`);
        console.log(`    - Total Value: $${stats.totalValue?.toLocaleString() || 0}`);
        
        // Verify client gets correct numbers
        if (stats.total === 7) {
          console.log('  ✅ CORRECT: Client sees exactly 7 exchanges');
        } else {
          console.log(`  ❌ INCORRECT: Client sees ${stats.total} exchanges instead of 7`);
        }
      }
    } catch (error) {
      console.error('  Error:', error.response?.data || error.message);
    }
    
    // Test admin statistics for comparison
    console.log('\n📊 Testing admin statistics for comparison:');
    const adminToken = jwt.sign(
      {
        userId: 'admin-user-id',
        email: 'admin@peak1031.com',
        role: 'admin'
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    try {
      const response = await axios.get(`${API_URL}/api/exchanges/statistics`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`
        }
      });
      
      if (response.data.statistics) {
        const stats = response.data.statistics;
        console.log('  Admin sees:');
        console.log(`    - Total: ${stats.total} (should be much more than 7)`);
        console.log(`    - Active: ${stats.active}`);
        console.log(`    - Completed: ${stats.completed}`);
      }
    } catch (error) {
      console.error('  Error:', error.response?.data || error.message);
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Check if server is running first
axios.get(`${API_URL}/health`)
  .then(() => {
    console.log('✅ Server is running on port 5001\n');
    testStatisticsEndpoint();
  })
  .catch(() => {
    console.error('❌ Server is not running. Please start the backend server first.');
    console.log('   Run: npm run dev:backend');
  });