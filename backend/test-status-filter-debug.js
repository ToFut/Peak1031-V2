const databaseService = require('./services/database');
const { Op } = require('sequelize');

async function testStatusFiltering() {
  console.log('=== Testing Status Filtering Debug ===\n');

  try {
    // Test 1: Build whereClause like the API does
    console.log('1. Testing whereClause construction:');
    const filters = { status: 'active' };
    const whereClause = {};
    
    if (filters.status) {
      const statusLower = filters.status.toLowerCase();
      if (statusLower === 'active') {
        whereClause.status = { [Op.in]: ['active', '45D', '180D', 'In Progress', 'Active'] };
        console.log('   Built whereClause:', JSON.stringify(whereClause, null, 2));
        console.log('   Status array:', whereClause.status[Object.getOwnPropertySymbols(whereClause.status)[0]]);
      }
    }

    // Test 2: Call getExchanges with this whereClause
    console.log('\n2. Testing database service call:');
    const options = {
      where: whereClause,
      limit: 5,
      orderBy: { column: 'created_at', ascending: false }
    };
    
    console.log('   Calling databaseService.getExchanges with options:', JSON.stringify(options, null, 2));
    
    const result = await databaseService.getExchanges(options);
    
    if (result) {
      console.log(`   ✅ Found ${result.length} exchanges`);
      result.forEach((ex, index) => {
        console.log(`     ${index + 1}. ID: ${ex.id}, Status: "${ex.status}"`);
      });
    } else {
      console.log('   ❌ No results returned');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testStatusFiltering().catch(console.error);