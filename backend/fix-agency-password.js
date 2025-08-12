const supabaseService = require('./services/supabase');
const bcrypt = require('bcryptjs');

async function fixAgencyPassword() {
  try {
    console.log('🔧 Fixing agency user password...');
    
    const email = 'agency@peak1031.com';
    const newPassword = 'agency123';
    
    // Generate new password hash
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('🔐 Generated new password hash');
    
    // Update user password
    const { data, error } = await supabaseService.client
      .from('users')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select();
    
    if (error) {
      console.error('❌ Failed to update password:', error);
      return;
    }
    
    console.log('✅ Password updated successfully for:', email);
    
    // Verify the fix
    const { data: users } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', email);
    
    if (users && users.length > 0) {
      const user = users[0];
      const isPasswordValid = await bcrypt.compare(newPassword, user.password_hash);
      console.log(`🔍 Password verification for "${newPassword}":`, isPasswordValid ? '✅ Valid' : '❌ Invalid');
      
      if (isPasswordValid) {
        console.log('🎉 Agency user can now login with agency@peak1031.com / agency123');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixAgencyPassword();