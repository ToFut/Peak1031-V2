const { sequelize } = require('../config/database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Import the User model
const User = require('../models/User');

async function createAdminUser() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Sync models to create tables
    await sequelize.sync({ force: false });
    console.log('✅ Database models synchronized.');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: { email: 'admin@peak1031.com' }
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists.');
      console.log('Email: admin@peak1031.com');
      console.log('Password: admin123');
      return;
    }

    // Create admin user
    const adminUser = await User.create({
      id: uuidv4(),
      email: 'admin@peak1031.com',
      passwordHash: 'admin123', // Will be hashed by the model hook
      firstName: 'Admin',
      lastName: 'User',
      role: 'admin',
      isActive: true,
      twoFaEnabled: false,
      phone: '+1234567890'
    });

    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@peak1031.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Role: Admin');
    console.log('🆔 User ID:', adminUser.id);

    // Create some sample users for testing
    const sampleUsers = [
      {
        email: 'client@peak1031.com',
        password: 'client123',
        first_name: 'John',
        last_name: 'Client',
        role: 'client',
        phone: '+1234567891'
      },
      {
        email: 'coordinator@peak1031.com',
        password: 'coordinator123',
        first_name: 'Sarah',
        last_name: 'Coordinator',
        role: 'coordinator',
        phone: '+1234567892'
      },
      {
        email: 'thirdparty@peak1031.com',
        password: 'thirdparty123',
        first_name: 'Mike',
        last_name: 'ThirdParty',
        role: 'third_party',
        phone: '+1234567893'
      },
      {
        email: 'agency@peak1031.com',
        password: 'agency123',
        first_name: 'Lisa',
        last_name: 'Agency',
        role: 'agency',
        phone: '+1234567894'
      }
    ];

    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({
        where: { email: userData.email }
      });

      if (!existingUser) {
        await User.create({
          id: uuidv4(),
          email: userData.email,
          passwordHash: userData.password, // Will be hashed by the model hook
          firstName: userData.first_name,
          lastName: userData.last_name,
          role: userData.role,
          isActive: true,
          twoFaEnabled: false,
          phone: userData.phone
        });
        console.log(`✅ Created ${userData.role} user: ${userData.email}`);
      }
    }

    console.log('\n🎉 Setup complete! You can now login with any of these accounts:');
    console.log('\n👑 Admin: admin@peak1031.com / admin123');
    console.log('👤 Client: client@peak1031.com / client123');
    console.log('🔧 Coordinator: coordinator@peak1031.com / coordinator123');
    console.log('🤝 Third Party: thirdparty@peak1031.com / thirdparty123');
    console.log('🏢 Agency: agency@peak1031.com / agency123');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
createAdminUser(); 