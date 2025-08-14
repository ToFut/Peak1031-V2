require('dotenv').config();
const bcrypt = require('bcryptjs');
const supabaseService = require('./services/supabase');

async function resetSegevPassword() {
  try {
    console.log('🔧 Checking for segev@futurixs.com in Supabase...');
    
    // Get the user from Supabase
    const { data: user, error } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'segev@futurixs.com')
      .single();
    
    if (error || !user) {
      console.log('❌ User segev@futurixs.com not found in Supabase');
      console.log('Creating new user...');
      
      // Create the user
      const hashedPassword = await bcrypt.hash('admin123', 12);
      const { data: newUser, error: createError } = await supabaseService.client
        .from('users')
        .insert({
          email: 'segev@futurixs.com',
          password_hash: hashedPassword,
          first_name: 'Segev',
          last_name: 'Admin',
          role: 'admin',
          is_active: true
        })
        .select()
        .single();
      
      if (createError) {
        console.log('❌ Error creating user:', createError);
        return;
      }
      
      console.log('✅ Created new user successfully!');
      console.log('📝 Login credentials:');
      console.log('   Email: segev@futurixs.com');
      console.log('   Password: admin123');
      console.log('   User ID:', newUser.id);
      return;
    }
    
    console.log('✅ Found existing user:', user.email, 'ID:', user.id);
    
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
    console.log('   Email: segev@futurixs.com');
    console.log('   Password: admin123');
    console.log('   User ID:', updatedUser.id);
  } catch (error) {
    console.error('❌ Error resetting password:', error);
  }
}

resetSegevPassword();

