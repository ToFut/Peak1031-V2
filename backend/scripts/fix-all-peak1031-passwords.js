const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixAllPeak1031Passwords() {
  try {
    console.log('🔧 Fixing passwords for all Peak1031 users...\n');

    // Define users and their passwords
    const userUpdates = [
      { email: 'admin@peak1031.com', password: 'admin123' },
      { email: 'client@peak1031.com', password: 'client123' },
      { email: 'coordinator@peak1031.com', password: 'coordinator123' },
      { email: 'agency@peak1031.com', password: 'agency123' },
      { email: 'thirdparty@peak1031.com', password: 'thirdparty123' }
    ];

    let successCount = 0;
    let notFoundCount = 0;

    for (const { email, password } of userUpdates) {
      console.log(`\n📧 Processing: ${email}`);
      
      // First check if user exists
      const { data: checkUser, error: checkError } = await supabase
        .from('users')
        .select('id, email, role, is_active')
        .eq('email', email)
        .single();

      if (checkError || !checkUser) {
        console.log(`❌ User not found: ${email}`);
        notFoundCount++;
        continue;
      }

      console.log(`✅ Found user: ${email} (Role: ${checkUser.role}, Active: ${checkUser.is_active})`);

      // Generate password hash
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Update the password
      const { data, error } = await supabase
        .from('users')
        .update({ 
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select();

      if (error) {
        console.error(`❌ Error updating ${email}:`, error);
      } else {
        console.log(`✅ Password updated successfully`);
        successCount++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Successfully updated: ${successCount} users`);
    console.log(`   ❌ Not found: ${notFoundCount} users`);
    
    if (successCount > 0) {
      console.log('\n📝 Updated credentials:');
      userUpdates.forEach(({ email, password }) => {
        console.log(`   ${email} / ${password}`);
      });
    }

    // Let's also check what Peak1031 users actually exist
    console.log('\n🔍 Checking all Peak1031 users in database:');
    const { data: allPeak1031Users, error: listError } = await supabase
      .from('users')
      .select('email, role, is_active, created_at')
      .like('email', '%@peak1031.com%')
      .order('email');

    if (!listError && allPeak1031Users) {
      console.log(`\nFound ${allPeak1031Users.length} Peak1031 users:`);
      allPeak1031Users.forEach(user => {
        console.log(`   ${user.email} - Role: ${user.role}, Active: ${user.is_active}`);
      });
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the fix
fixAllPeak1031Passwords();