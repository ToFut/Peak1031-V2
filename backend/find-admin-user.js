#!/usr/bin/env node

require('dotenv').config();
const { sequelize } = require('./config/database');
const User = require('./models/User');

async function findAdminUser() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Find admin user
    const adminUser = await User.findOne({
      where: { email: 'admin@peak1031.com' }
    });

    if (adminUser) {
      console.log('✅ Admin user found!');
      console.log('📧 Email:', adminUser.email);
      console.log('🆔 User ID:', adminUser.id);
      console.log('👤 Role:', adminUser.role);
      console.log('✅ Active:', adminUser.isActive);
    } else {
      console.log('❌ Admin user not found');
    }

  } catch (error) {
    console.error('❌ Error finding admin user:', error);
  } finally {
    await sequelize.close();
  }
}

// Run the script
findAdminUser(); 