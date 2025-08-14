require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabaseService = require('./services/supabase');

async function testAdminLogin() {
  console.log('🔍 Testing admin login...');
  
  try {
    // Get the admin user
    const adminUser = await supabaseService.getUserByEmail('admin@peak1031.com');
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      return;
    }
    
    console.log('✅ Admin user found:', {
      id: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      isActive: adminUser.is_active,
      hasPasswordHash: !!adminUser.password_hash
    });
    
    // Test password validation
    const testPassword = 'admin123';
    console.log('🔐 Testing password validation...');
    
    if (!adminUser.password_hash) {
      console.log('❌ No password hash found for admin user');
      return;
    }
    
    const isValidPassword = await bcrypt.compare(testPassword, adminUser.password_hash);
    console.log('🔐 Password validation result:', isValidPassword);
    
    if (isValidPassword) {
      console.log('✅ Password is valid!');
    } else {
      console.log('❌ Password is invalid');
      console.log('🔍 Password hash:', adminUser.password_hash);
      
      // Try to generate a new hash for comparison
      const newHash = await bcrypt.hash(testPassword, 12);
      console.log('🔍 New hash for admin123:', newHash);
    }
    
  } catch (error) {
    console.error('❌ Error testing admin login:', error);
  }
}

testAdminLogin();
