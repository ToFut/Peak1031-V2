require('dotenv').config();
const bcrypt = require('bcryptjs');
const { User } = require('../models');

const testUsers = [
  {
    email: 'admin@peak1031.com',
    password: 'admin123',
    role: 'admin',
    firstName: 'Admin',
    lastName: 'User'
  },
  {
    email: 'coordinator@peak1031.com',
    password: 'coordinator123',
    role: 'coordinator',
    firstName: 'Demo',
    lastName: 'Coordinator'
  },
  {
    email: 'client@peak1031.com',
    password: 'client123',
    role: 'client',
    firstName: 'Demo',
    lastName: 'Client'
  },
  {
    email: 'agency@peak1031.com',
    password: 'agency123',
    role: 'agency',
    firstName: 'Demo',
    lastName: 'Agency'
  },
  {
    email: 'thirdparty@peak1031.com',
    password: 'thirdparty123',
    role: 'third_party',
    firstName: 'Demo',
    lastName: 'Third Party'
  }
];

async function setupLocalUsers() {
  console.log('🔧 Setting up local test users...');
  
  for (const userData of testUsers) {
    try {
      console.log(`\n👤 Setting up ${userData.role} user: ${userData.email}`);
      
      // Check if user already exists
      const existingUser = await User.findOne({ where: { email: userData.email } });
      
      if (existingUser) {
        console.log(`✅ User already exists: ${userData.email}`);
        
        // Update password hash if needed
        const isValidPassword = await existingUser.validatePassword(userData.password);
        if (!isValidPassword) {
          console.log(`🔄 Updating password hash for ${userData.email}`);
          const passwordHash = await bcrypt.hash(userData.password, 12);
          await existingUser.update({ passwordHash });
          console.log(`✅ Password updated for ${userData.email}`);
        }
      } else {
        // Create new user with hashed password
        console.log(`📝 Creating new user: ${userData.email}`);
        const passwordHash = await bcrypt.hash(userData.password, 12);
        
        const newUser = await User.create({
          email: userData.email,
          passwordHash: passwordHash,
          role: userData.role,
          firstName: userData.firstName,
          lastName: userData.lastName,
          isActive: true
        });
        
        console.log(`✅ Created user: ${userData.email} (ID: ${newUser.id})`);
      }
      
      // Test authentication
      const testUser = await User.findOne({ where: { email: userData.email } });
      const isValidPassword = await testUser.validatePassword(userData.password);
      
      if (isValidPassword) {
        console.log(`✅ Authentication test successful for ${userData.email}`);
      } else {
        console.error(`❌ Authentication test failed for ${userData.email}`);
      }
      
    } catch (error) {
      console.error(`❌ Error setting up user ${userData.email}:`, error.message);
    }
  }
  
  console.log('\n🎉 Local test users setup completed!');
  console.log('\n📋 Login credentials:');
  testUsers.forEach(user => {
    console.log(`   ${user.role.toUpperCase()}: ${user.email} / ${user.password}`);
  });
}

setupLocalUsers().catch(console.error);







