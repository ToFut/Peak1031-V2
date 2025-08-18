const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugThirdPartyAuth() {
  try {
    console.log('🔍 Debugging third-party authentication...');
    
    // Get user from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'thirdparty@peak1031.com')
      .single();

    if (userError) {
      console.error('❌ Error getting user:', userError);
      return;
    }

    console.log('✅ User found in users table:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Active: ${user.is_active}`);
    console.log(`   Password hash exists: ${!!user.password_hash}`);
    console.log(`   Password field exists: ${!!user.password}`);
    console.log(`   PasswordHash field exists: ${!!user.passwordHash}`);
    
    if (user.password_hash) {
      console.log(`   Password hash: ${user.password_hash.substring(0, 20)}...`);
    }
    
    // Check auth.users table
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
    
    if (authError) {
      console.error('❌ Error getting auth user:', authError);
      return;
    }

    console.log('\n✅ User found in auth.users:');
    console.log(`   ID: ${authUser.user.id}`);
    console.log(`   Email: ${authUser.user.email}`);
    console.log(`   Email confirmed: ${authUser.user.email_confirmed_at}`);
    console.log(`   Created at: ${authUser.user.created_at}`);
    console.log(`   Last sign in: ${authUser.user.last_sign_in_at}`);
    
    // Try to authenticate directly with Supabase
    console.log('\n🔐 Testing direct Supabase authentication...');
    
    const { data: authData, error: authTestError } = await supabase.auth.signInWithPassword({
      email: 'thirdparty@peak1031.com',
      password: 'Peak2024!'
    });
    
    if (authTestError) {
      console.error('❌ Direct Supabase auth failed:', authTestError.message);
      console.error('   Error details:', authTestError);
    } else {
      console.log('✅ Direct Supabase auth successful!');
      console.log(`   User ID: ${authData.user.id}`);
      console.log(`   Access token: ${authData.session.access_token.substring(0, 20)}...`);
    }
    
    // Check if we need to reset the password
    console.log('\n🔄 Checking if password reset is needed...');
    
    // Try to update the password
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password: 'Peak2024!'
    });
    
    if (updateError) {
      console.error('❌ Password update failed:', updateError.message);
    } else {
      console.log('✅ Password updated successfully');
      console.log(`   User ID: ${updateData.user.id}`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugThirdPartyAuth();








