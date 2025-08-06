require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabaseService = require('./services/supabase');

async function fixAdminPassword() {
  try {
    console.log('🔧 Fixing admin password...');
    
    // Get admin user
    const admin = await supabaseService.getUserByEmail('admin@peak1031.com');
    if (!admin) {
      console.error('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Found admin user:', admin.email);
    console.log('🔍 Current password hash exists:', !!admin.password_hash);
    
    // Generate new password hash for TempPass123!
    const newPasswordHash = await bcrypt.hash('TempPass123!', 10);
    console.log('🔐 Generated new password hash');
    
    // Update the password
    await supabaseService.updateUser(admin.id, {
      password_hash: newPasswordHash
    });
    
    console.log('✅ Admin password updated successfully');
    console.log('📝 You can now login with:');
    console.log('   Email: admin@peak1031.com');
    console.log('   Password: TempPass123!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAdminPassword();