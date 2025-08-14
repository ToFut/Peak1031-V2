const databaseService = require('./backend/services/database');

async function checkAndCreateAgencyUsers() {
  try {
    console.log('🔍 Checking for agency users...');
    
    // Get all users
    const allUsers = await databaseService.getUsers();
    console.log('📊 Total users found:', allUsers.length);
    
    // Filter agency users
    const agencyUsers = allUsers.filter(user => user.role === 'agency');
    console.log('🏢 Agency users found:', agencyUsers.length);
    
    if (agencyUsers.length === 0) {
      console.log('❌ No agency users found. Creating sample agency users...');
    } else {
      console.log('🔧 Found existing agency users, but some may need data updates...');
    }
    
    // Create sample agency users
    const sampleAgencies = [
      {
        email: 'agency1@peak1031.com',
        first_name: 'John',
        last_name: 'Smith',
        company: 'Smith Real Estate Agency',
        phone_primary: '(555) 123-4567',
        role: 'agency',
        is_active: true
      },
      {
        email: 'agency2@peak1031.com',
        first_name: 'Sarah',
        last_name: 'Johnson',
        company: 'Johnson Property Group',
        phone_primary: '(555) 234-5678',
        role: 'agency',
        is_active: true
      },
      {
        email: 'agency3@peak1031.com',
        first_name: 'Michael',
        last_name: 'Brown',
        company: 'Brown Investment Properties',
        phone_primary: '(555) 345-6789',
        role: 'agency',
        is_active: true
      }
    ];
    
    for (const agencyData of sampleAgencies) {
      try {
        // Check if user already exists
        const existingUser = await databaseService.getUserByEmail(agencyData.email);
        if (existingUser) {
          console.log(`✅ Agency user already exists: ${agencyData.email}`);
          
          // Update existing user if they have missing data
          if (!existingUser.first_name || !existingUser.last_name || !existingUser.company) {
            console.log(`🔧 Updating agency user data: ${agencyData.email}`);
            await databaseService.updateUser(existingUser.id, {
              first_name: agencyData.first_name,
              last_name: agencyData.last_name,
              company: agencyData.company,
              phone_primary: agencyData.phone_primary
            });
            console.log(`✅ Updated agency user: ${agencyData.email}`);
          }
          continue;
        }
        
        // Create new agency user
        const newUser = await databaseService.createUser({
          ...agencyData,
          passwordHash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8e' // password: agency123
        });
        
        console.log(`✅ Created agency user: ${newUser.email} (ID: ${newUser.id})`);
      } catch (error) {
        console.error(`❌ Failed to create agency user ${agencyData.email}:`, error.message);
      }
    }
    
    // Check again after creation/updates
    const updatedUsers = await databaseService.getUsers();
    const updatedAgencyUsers = updatedUsers.filter(user => user.role === 'agency');
    console.log('🏢 Agency users after creation/updates:', updatedAgencyUsers.length);
    
    if (updatedAgencyUsers.length > 0) {
      console.log('📋 Agency users:');
      updatedAgencyUsers.forEach(user => {
        console.log(`  - ${user.email} (${user.first_name || 'N/A'} ${user.last_name || 'N/A'}) - ${user.company || 'No company'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking agency users:', error);
  }
}

// Run the check
checkAndCreateAgencyUsers();
