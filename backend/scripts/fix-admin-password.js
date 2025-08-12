const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixAdminPassword() {
  try {
    console.log('🔧 Fixing admin password...\n');

    const email = 'admin@peak1031.com';
    const newPassword = 'admin123';
    
    // Generate new password hash
    const passwordHash = await bcrypt.hash(newPassword, 10);
    console.log('🔐 Generated new password hash');

    // Update the user's password
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select();

    if (error) {
      console.error('❌ Error updating password:', error);
      return;
    }

    if (data && data.length > 0) {
      console.log('✅ Successfully updated password for admin@peak1031.com');
      console.log('\n📋 Updated user:');
      console.log('   Email:', data[0].email);
      console.log('   Role:', data[0].role);
      console.log('   ID:', data[0].id);
      console.log('\n✅ You can now login with:');
      console.log('   Email: admin@peak1031.com');
      console.log('   Password: admin123');
    } else {
      console.log('⚠️  No user was updated');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the fix
fixAdminPassword();