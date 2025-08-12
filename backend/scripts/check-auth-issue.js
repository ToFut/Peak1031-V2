const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAuthIssue() {
  try {
    console.log('🔍 Checking authentication issue...\n');

    // Check environment variables
    console.log('📋 Environment Check:');
    console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
    console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
    console.log('');

    // Test Supabase connection
    console.log('🔌 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('❌ Supabase connection error:', testError);
      return;
    }
    console.log('✅ Supabase connection successful\n');

    // Check for admin user
    const email = 'admin@peak1031.com';
    console.log(`🔍 Looking for user: ${email}`);
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email);

    if (error) {
      console.error('❌ Error fetching user:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ User not found in database');
      console.log('\n💡 The user might not exist. Would you like to create it?');
      return;
    }

    const user = users[0];
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      created_at: user.created_at
    });

    // Check password field
    console.log('\n🔐 Password field check:');
    console.log('   password_hash:', user.password_hash ? '✅ Has value' : '❌ Empty/Missing');
    console.log('   password:', user.password ? '✅ Has value' : '❌ Empty/Missing');
    
    // Show all fields
    console.log('\n📋 All user fields:');
    Object.keys(user).forEach(key => {
      if (key.includes('password')) {
        console.log(`   ${key}: ${user[key] ? '[HIDDEN]' : 'null'}`);
      } else {
        console.log(`   ${key}: ${user[key]}`);
      }
    });

    // Test password validation if hash exists
    const passwordField = user.password_hash || user.password;
    if (passwordField) {
      console.log('\n🔐 Testing password validation...');
      const testPassword = 'admin123';
      
      try {
        const isValid = await bcrypt.compare(testPassword, passwordField);
        console.log(`   Password "${testPassword}" validation:`, isValid ? '✅ Valid' : '❌ Invalid');
        
        if (!isValid) {
          // Generate correct hash for reference
          const correctHash = await bcrypt.hash(testPassword, 10);
          console.log('\n💡 To fix, update the password_hash field with this hash:');
          console.log(`   ${correctHash}`);
        }
      } catch (err) {
        console.error('❌ Error validating password:', err.message);
      }
    } else {
      console.log('\n❌ No password field found in user record');
      
      // Generate hash for admin123
      const hash = await bcrypt.hash('admin123', 10);
      console.log('\n💡 To fix, add this password hash to the user:');
      console.log(`   UPDATE users SET password_hash = '${hash}' WHERE email = '${email}';`);
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the diagnostic
checkAuthIssue();