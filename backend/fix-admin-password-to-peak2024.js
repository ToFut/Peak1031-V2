require('dotenv').config();
const bcrypt = require('bcryptjs');
const databaseService = require('./services/database');

async function updateAdminPassword() {
  try {
    console.log('🔧 Updating admin password...');
    
    // Get the admin user
    const adminUser = await databaseService.getUserByEmail('admin@peak1031.com');
    if (!adminUser) {
      console.log('❌ Admin user not found!');
      return;
    }

    console.log('✅ Found admin user:', adminUser.email);

    // Hash the new password
    const newPassword = 'Peak2024!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log('🔐 New password hashed');
    
    // Update the password
    await databaseService.updateUser(adminUser.id, {
      password_hash: hashedPassword
    });

    console.log('✅ Admin password updated successfully!');
    console.log('📧 Email: admin@peak1031.com');
    console.log('🔑 Password: Peak2024!');
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error);
  } finally {
    process.exit();
  }
}

updateAdminPassword();