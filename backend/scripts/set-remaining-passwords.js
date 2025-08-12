const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setRemainingPasswords() {
  try {
    console.log('🔧 Setting passwords for remaining Peak1031 users...\n');

    // Get all Peak1031 users
    const { data: allUsers, error: listError } = await supabase
      .from('users')
      .select('email, role, is_active')
      .like('email', '%@peak1031.com%')
      .order('email');

    if (listError) {
      console.error('❌ Error fetching users:', listError);
      return;
    }

    // Exclude the main users we already set
    const alreadySet = [
      'admin@peak1031.com',
      'client@peak1031.com', 
      'coordinator@peak1031.com',
      'agency@peak1031.com'
    ];

    const remainingUsers = allUsers.filter(user => !alreadySet.includes(user.email));
    
    console.log(`Found ${remainingUsers.length} remaining users to update:\n`);

    const newPassword = 'peak2025!';
    const passwordHash = await bcrypt.hash(newPassword, 10);
    console.log('🔐 Generated password hash for: peak2025!\n');

    let successCount = 0;

    for (const user of remainingUsers) {
      console.log(`📧 Updating: ${user.email} (${user.role})`);
      
      const { error } = await supabase
        .from('users')
        .update({ 
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('email', user.email);

      if (error) {
        console.error(`❌ Error updating ${user.email}:`, error);
      } else {
        console.log(`✅ Password updated successfully`);
        successCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully updated: ${successCount} users`);
    
    console.log('\n📝 ALL Peak1031 Credentials:');
    console.log('\n🔑 Main users:');
    console.log('   admin@peak1031.com / admin123');
    console.log('   client@peak1031.com / client123');
    console.log('   coordinator@peak1031.com / coordinator123');
    console.log('   agency@peak1031.com / agency123');
    
    console.log('\n🔑 All other Peak1031 users:');
    remainingUsers.forEach(user => {
      console.log(`   ${user.email} / peak2025!`);
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the update
setRemainingPasswords();