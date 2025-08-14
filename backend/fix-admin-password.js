const { sequelize } = require('./config/database');
const User = require('./models/User');

async function fixAdminPassword() {
  try {
    await sequelize.sync();
    
    // Find the admin user
    const adminUser = await User.findOne({ where: { email: 'admin@peak1031.com' } });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Found admin user:', adminUser.email);
    
    // Set the raw password (the model hook will hash it)
    await adminUser.update({ passwordHash: 'admin123' });
    
    console.log('✅ Admin password updated successfully');
    console.log('📧 Email: admin@peak1031.com');
    console.log('🔑 Password: admin123');
    
    // Test the authentication
    const isValid = await adminUser.validatePassword('admin123');
    console.log('✅ Password validation test:', isValid ? 'PASSED' : 'FAILED');
    
  } catch (error) {
    console.error('❌ Error fixing admin password:', error);
  } finally {
    await sequelize.close();
  }
}

fixAdminPassword();