const supabaseService = require('./services/supabase');
const bcrypt = require('bcryptjs');

async function checkAgencyUser() {
  try {
    console.log('🔍 Checking for agency user...');
    
    // Check if agency user exists
    const { data: users, error } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'agency@peak1031.com');
    
    if (error) {
      console.error('❌ Database error:', error);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ Agency user not found in database');
      
      // Show all users for debugging
      const { data: allUsers } = await supabaseService.client
        .from('users')
        .select('email, role, is_active');
      
      console.log('Available users:', allUsers);
      return;
    }
    
    const user = users[0];
    console.log('✅ Agency user found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      name: `${user.first_name} ${user.last_name}`,
      created_at: user.created_at
    });
    
    // Test password verification
    const testPassword = 'agency123';
    const isPasswordValid = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`🔐 Password check for "${testPassword}":`, isPasswordValid ? '✅ Valid' : '❌ Invalid');
    
    // Check if user has contact_id
    if (user.contact_id) {
      console.log('📞 Contact ID:', user.contact_id);
      
      // Check contact details
      const { data: contact } = await supabaseService.client
        .from('contacts')
        .select('*')
        .eq('id', user.contact_id)
        .single();
      
      if (contact) {
        console.log('✅ Contact found:', {
          display_name: contact.display_name,
          company: contact.company,
          contact_type: contact.contact_type
        });
      } else {
        console.log('❌ Contact not found for user');
      }
    } else {
      console.log('⚠️ User has no contact_id assigned');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAgencyUser();