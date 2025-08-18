const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAndCreateThirdPartyUser() {
  try {
    console.log('🔍 Checking for third-party user...');
    
    // Check if third-party user exists
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'thirdparty@peak1031.com')
      .single();

    if (userError && userError.code !== 'PGRST116') {
      console.error('❌ Error checking user:', userError);
      return;
    }

    if (existingUser) {
      console.log('✅ Third-party user already exists:');
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Active: ${existingUser.is_active}`);
      console.log(`   ID: ${existingUser.id}`);
      
      // Check if user exists in auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(existingUser.id);
      
      if (authError) {
        console.log('⚠️  User exists in users table but not in auth.users');
        console.log('   Creating auth user...');
        
        // Create auth user
        const { data: newAuthUser, error: createError } = await supabase.auth.admin.createUser({
          email: 'thirdparty@peak1031.com',
          password: 'Peak2024!',
          email_confirm: true,
          user_metadata: { role: 'third_party' }
        });
        
        if (createError) {
          console.error('❌ Error creating auth user:', createError);
          return;
        }
        
        console.log('✅ Auth user created successfully');
        console.log(`   Auth ID: ${newAuthUser.user.id}`);
        
        // Update the users table with the auth ID
        const { error: updateError } = await supabase
          .from('users')
          .update({ id: newAuthUser.user.id })
          .eq('email', 'thirdparty@peak1031.com');
        
        if (updateError) {
          console.error('❌ Error updating user ID:', updateError);
        } else {
          console.log('✅ User ID updated in users table');
        }
      } else {
        console.log('✅ User exists in both users table and auth.users');
        console.log(`   Auth ID: ${authUser.user.id}`);
      }
    } else {
      console.log('❌ Third-party user not found, creating...');
      
      // Create auth user first
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: 'thirdparty@peak1031.com',
        password: 'Peak2024!',
        email_confirm: true,
        user_metadata: { role: 'third_party' }
      });
      
      if (authError) {
        console.error('❌ Error creating auth user:', authError);
        return;
      }
      
      console.log('✅ Auth user created successfully');
      console.log(`   Auth ID: ${authUser.user.id}`);
      
      // Create user in users table
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: authUser.user.id,
          email: 'thirdparty@peak1031.com',
          first_name: 'Third',
          last_name: 'Party',
          role: 'third_party',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('❌ Error creating user in users table:', insertError);
        return;
      }
      
      console.log('✅ Third-party user created successfully in users table');
    }
    
    console.log('\n🎉 Third-party user setup complete!');
    console.log('   Email: thirdparty@peak1031.com');
    console.log('   Password: Peak2024!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAndCreateThirdPartyUser();








