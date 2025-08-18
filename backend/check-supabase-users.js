require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkSupabaseUsers() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    console.log('🔍 Checking users in Supabase...');
    
    const { data, error } = await supabase
      .from('people')
      .select('id, email, password_hash, is_user, is_active')
      .eq('email', 'admin@peak1031.com');
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }
    
    console.log(`✅ Found ${data.length} users with email admin@peak1031.com:`);
    data.forEach((user, index) => {
      console.log(`User ${index + 1}:`, {
        id: user.id,
        email: user.email,
        hasPassword: !!user.password_hash,
        isUser: user.is_user,
        isActive: user.is_active
      });
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkSupabaseUsers();











