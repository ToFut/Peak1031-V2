const { sequelize } = require('./config/database');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

async function testAdminLogin() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');

    // Find the admin user
    const adminUser = await User.findOne({
      where: { email: 'admin@peak1031.com' }
    });

    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }

    console.log('✅ Admin user found:', {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      isActive: adminUser.isActive,
      passwordHash: adminUser.passwordHash ? 'Set' : 'Not set'
    });

    // Test password validation
    const testPassword = 'admin123';
    const isValid = await adminUser.validatePassword(testPassword);
    
    console.log('🔐 Password validation test:');
    console.log('   Password:', testPassword);
    console.log('   Is valid:', isValid);

    if (!isValid) {
      console.log('❌ Password validation failed');
      console.log('   This might be because the password was not hashed correctly');
      
      // Try to update the password
      console.log('🔄 Attempting to fix password...');
      adminUser.passwordHash = testPassword; // This will be hashed by the model hook
      await adminUser.save();
      
      console.log('✅ Password updated, testing again...');
      const isValidAfterUpdate = await adminUser.validatePassword(testPassword);
      console.log('   Is valid after update:', isValidAfterUpdate);
    }

  } catch (error) {
    console.error('❌ Error testing admin login:', error);
  } finally {
    await sequelize.close();
  }
}

testAdminLogin(); 