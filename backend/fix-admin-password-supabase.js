const bcrypt = require('bcryptjs');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function fixAdminPasswordSupabase() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    console.log('🔐 Fixing admin password in Supabase...');
    
    // Hash the password
    const passwordHash = await bcrypt.hash('admin123', 12);
    
    // Update the admin user in Supabase
    const { data, error } = await supabase
      .from('people')
      .update({ 
        password_hash: passwordHash,
        is_user: true,
        is_active: true
      })
      .eq('email', 'admin@peak1031.com')
      .select();
    
    if (error) {
      console.error('❌ Error updating admin password:', error);
      return;
    }
    
    console.log('✅ Admin password updated successfully in Supabase');
    console.log('📧 Email: admin@peak1031.com');
    console.log('🔑 Password: admin123');
    
    // Verify the update
    const { data: admin, error: fetchError } = await supabase
      .from('people')
      .select('id, email, password_hash, is_user, is_active')
      .eq('email', 'admin@peak1031.com')
      .single();
      
    if (fetchError) {
      console.error('❌ Error fetching admin:', fetchError);
    } else {
      console.log('✅ Admin user verified:', {
        email: admin.email,
        hasPassword: !!admin.password_hash,
        isUser: admin.is_user,
        isActive: admin.is_active
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixAdminPasswordSupabase();



