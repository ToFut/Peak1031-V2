require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase Admin
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function createAdminAuthUser() {
  try {
    console.log('🔧 Creating admin user in Supabase Auth...');
    
    // Create user in Supabase Auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: 'admin@peak1031.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        role: 'admin'
      }
    });

    if (error) {
      console.error('❌ Error creating admin auth user:', error);
      return;
    }

    console.log('✅ Admin auth user created:', {
      id: data.user.id,
      email: data.user.email,
      created_at: data.user.created_at
    });

    // Check if user profile exists and update if needed
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'admin@peak1031.com')
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error checking user profile:', profileError);
      return;
    }

    if (profile) {
      // Update existing profile with auth user ID
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ id: data.user.id })
        .eq('email', 'admin@peak1031.com');

      if (updateError) {
        console.error('❌ Error updating user profile:', updateError);
      } else {
        console.log('✅ User profile updated with auth ID');
      }
    } else {
      // Create new profile
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: data.user.id,
          email: 'admin@peak1031.com',
          display_name: 'System Administrator',
          first_name: 'System',
          last_name: 'Administrator',
          role: 'admin',
          is_active: true
        });

      if (insertError) {
        console.error('❌ Error creating user profile:', insertError);
      } else {
        console.log('✅ User profile created');
      }
    }

    console.log('🔐 LOGIN CREDENTIALS:');
    console.log('   Email: admin@peak1031.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAdminAuthUser();