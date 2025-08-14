require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabaseService = require('./services/supabase');

async function resetAbolPassword() {
  try {
    console.log('🔧 Resetting password for abol@peakcorp.com using Supabase...');
    
    // Get the user from Supabase
    const { data: user, error } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'abol@peakcorp.com')
      .single();
    
    if (error || !user) {
      console.log('❌ User abol@peakcorp.com not found in Supabase');
      console.log('Error:', error);
      return;
    }
    
    console.log('✅ Found user:', user.email, 'ID:', user.id);
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Update the user in Supabase
    const { data: updatedUser, error: updateError } = await supabaseService.client
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', user.id)
      .select()
      .single();
    
    if (updateError) {
      console.log('❌ Error updating password:', updateError);
      return;
    }
    
    console.log('✅ Password reset successfully!');
    console.log('📝 Login credentials:');
    console.log('   Email: abol@peakcorp.com');
    console.log('   Password: admin123');
    console.log('   User ID:', updatedUser.id);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  }
}

resetAbolPassword();
