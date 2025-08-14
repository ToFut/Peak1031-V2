const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixAdminRole() {
  try {
    console.log('🔧 Fixing admin user role...');
    
    // First, let's check the current state of the admin user
    const { data: currentUser, error: fetchError } = await supabase
      .from('people')
      .select('*')
      .eq('email', 'admin@peak1031.com')
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching admin user:', fetchError);
      return;
    }
    
    console.log('📋 Current admin user data:', {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
      is_active: currentUser.is_active
    });
    
    // Update the role to 'admin'
    const { data: updatedUser, error: updateError } = await supabase
      .from('people')
      .update({ role: 'admin' })
      .eq('email', 'admin@peak1031.com')
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ Error updating admin role:', updateError);
      return;
    }
    
    console.log('✅ Admin role updated successfully!');
    console.log('📋 Updated admin user data:', {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
      is_active: updatedUser.is_active
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixAdminRole();