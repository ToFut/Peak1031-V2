const { Op } = require('sequelize');
const databaseService = require('./services/database');

// Simulate the buildExchangeWhereClause function
async function buildExchangeWhereClause(user, filters) {
  const whereClause = {};

  console.log('🔍 Building where clause for user:', {
    id: user.id,
    email: user.email,
    role: user.role,
    contact_id: user.contact_id
  });

  // Base active filter
  if (!filters.include_inactive) {
    whereClause.is_active = true;
    console.log('✅ Added is_active filter');
  }

  console.log('🎭 Checking user role:', user.role);

  // Role-based filtering
  if (user.role === 'client') {
    console.log('📋 Processing CLIENT role');
    // Client logic would go here
  } else if (user.role === 'coordinator') {
    console.log('📋 Processing COORDINATOR role');
    whereClause.coordinator_id = user.id;
  } else if (user.role === 'third_party' || user.role === 'agency') {
    console.log('📋 Processing THIRD_PARTY/AGENCY role');
    // Third party logic would go here
  } else if (user.role === 'admin' || user.role === 'staff') {
    console.log('📋 Processing ADMIN/STAFF role - should see all exchanges');
    // No additional filtering for admin/staff
  } else {
    console.log('❓ Unknown role - no specific filtering');
  }
  
  console.log('🏁 Final where clause:', JSON.stringify(whereClause, null, 2));
  
  return whereClause;
}

async function debugWhereClause() {
  console.log('🧪 Debugging buildExchangeWhereClause for admin...\n');
  
  const adminUser = {
    id: '278304de-568f-4138-b35b-6fdcfbd2f1ce',
    email: 'admin@peak1031.com',
    role: 'admin',
    contact_id: null
  };
  
  const filters = {
    include_inactive: false
  };
  
  const whereClause = await buildExchangeWhereClause(adminUser, filters);
  
  console.log('\n📊 Testing with actual database query...');
  
  try {
    const exchanges = await databaseService.getExchanges({
      where: whereClause,
      limit: 5
    });
    
    console.log('✅ Database query successful');
    console.log('📋 Found exchanges:', exchanges?.length || 0);
    
    if (exchanges && exchanges.length > 0) {
      console.log('First exchange:', {
        id: exchanges[0].id,
        name: exchanges[0].name,
        is_active: exchanges[0].is_active
      });
      
      // Check if SEGEV DEMO is in the results
      const segevDemo = exchanges.find(ex => ex.id === 'ba7865ac-da20-404a-b609-804d15cb0467');
      if (segevDemo) {
        console.log('✅ SEGEV DEMO found in results');
      }
    }
    
    // Also test raw count
    const allExchanges = await databaseService.getExchanges({ where: whereClause });
    console.log('📈 Total exchanges matching criteria:', allExchanges?.length || 0);
    
  } catch (error) {
    console.error('❌ Database query failed:', error.message);
  }
}

debugWhereClause();