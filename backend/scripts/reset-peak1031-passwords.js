const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function resetPeak1031Passwords() {
  try {
    console.log('🔄 Starting password reset for Peak1031 users...');

    // Define users and their new passwords
    const userUpdates = [
      { email: 'admin@peak1031.com', password: 'admin123' },
      { email: 'client@peak1031.com', password: 'client123' },
      { email: 'coordinator@peak1031.com', password: 'coordinator123' },
      { email: 'agency@peak1031.com', password: 'agency123' },
      { email: 'thirdparty@peak1031.com', password: 'thirdparty123' }
    ];

    for (const { email, password } of userUpdates) {
      console.log(`\n📧 Processing user: ${email}`);

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      console.log('🔒 Password hashed successfully');

      // Update the user's password
      const { data, error } = await supabase
        .from('users')
        .update({ 
          password: hashedPassword,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select();

      if (error) {
        console.error(`❌ Error updating ${email}:`, error);
      } else if (data && data.length > 0) {
        console.log(`✅ Successfully updated password for ${email}`);
        console.log(`   User ID: ${data[0].id}`);
        console.log(`   Role: ${data[0].role}`);
      } else {
        console.log(`⚠️  User ${email} not found in database`);
      }
    }

    console.log('\n✅ Password reset complete!');
    console.log('\n📝 Updated credentials:');
    console.log('   admin@peak1031.com / admin123');
    console.log('   client@peak1031.com / client123');
    console.log('   coordinator@peak1031.com / coordinator123');
    console.log('   agency@peak1031.com / agency123');
    console.log('   thirdparty@peak1031.com / thirdparty123');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
resetPeak1031Passwords();