require('dotenv').config();
const bcrypt = require('bcryptjs');
const databaseService = require('./services/database');

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...');
    
    // Check if user already exists
    const existingUser = await databaseService.getUserByEmail('admin@peak1031.com');
    if (existingUser) {
      console.log('✅ Admin user already exists:', existingUser.email);
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Create user data
    const userData = {
      email: 'admin@peak1031.com',
      password_hash: hashedPassword,
      first_name: 'System',
      last_name: 'Administrator',
      role: 'admin',
      is_active: true
    };

    // Create user
    const user = await databaseService.createUser(userData);
    
    console.log('✅ Admin user created successfully:', {
      id: user.id,
      email: user.email,
      role: user.role
    });

    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('   Email: admin@peak1031.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  }
}

createAdminUser();
