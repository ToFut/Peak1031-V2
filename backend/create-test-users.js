require('dotenv').config();
const supabaseService = require('./services/supabase');
const bcrypt = require('bcrypt');

async function createTestUsers() {
  try {
    console.log('👥 Creating test users in Supabase...');
    
    // Create test users with different roles
    const testUsers = [
      {
        email: 'john.client@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        first_name: 'John',
        last_name: 'Client',
        role: 'client',
        phone: '+1234567890',
        organization_name: 'ABC Company',
        is_active: true
      },
      {
        email: 'jane.coordinator@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        first_name: 'Jane',
        last_name: 'Coordinator',
        role: 'coordinator',
        phone: '+1234567891',
        organization_name: 'Peak 1031',
        is_active: true
      },
      {
        email: 'mike.agency@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        first_name: 'Mike',
        last_name: 'Agency',
        role: 'agency',
        phone: '+1234567892',
        organization_name: 'XYZ Agency',
        is_active: true
      },
      {
        email: 'sarah.thirdparty@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        first_name: 'Sarah',
        last_name: 'ThirdParty',
        role: 'third_party',
        phone: '+1234567893',
        organization_name: 'Law Firm LLP',
        is_active: true
      },
      {
        email: 'test.user1@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        first_name: 'Test',
        last_name: 'User One',
        role: 'client',
        phone: '+1234567894',
        organization_name: 'Test Company 1',
        is_active: true
      },
      {
        email: 'test.user2@example.com',
        password_hash: await bcrypt.hash('password123', 10),
        first_name: 'Test',
        last_name: 'User Two',
        role: 'client',
        phone: '+1234567895',
        organization_name: 'Test Company 2',
        is_active: true
      }
    ];
    
    // Create users
    for (const userData of testUsers) {
      try {
        // Check if user already exists
        const existing = await supabaseService.select('users', {
          where: { email: userData.email }
        });
        
        if (existing.length > 0) {
          console.log(`⚠️ User ${userData.email} already exists`);
          continue;
        }
        
        const result = await supabaseService.insert('users', userData);
        console.log(`✅ Created user: ${userData.email} (${userData.role})`);
      } catch (error) {
        console.error(`❌ Failed to create user ${userData.email}:`, error.message);
      }
    }
    
    // Fetch and display all users
    console.log('\n📄 Current users in database:');
    const allUsers = await supabaseService.select('users', {
      orderBy: { column: 'created_at', ascending: false }
    });
    
    console.table(allUsers.map(u => ({
      email: u.email,
      name: `${u.first_name} ${u.last_name}`,
      role: u.role,
      company: u.organization_name,
      active: u.is_active
    })));
    
    console.log(`\n🎆 Total users: ${allUsers.length}`);
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    process.exit(0);
  }
}

createTestUsers();
