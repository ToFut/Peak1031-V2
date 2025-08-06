require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkSupabaseUsers() {
  try {
    console.log('🔍 Checking Supabase users...');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get all users
    const { data: users, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.log('❌ Error fetching users:', error.message);
      return;
    }
    
    console.log('✅ Users found:', users.length);
    users.forEach(user => {
      console.log(`👤 User: ${user.email} (ID: ${user.id}, Role: ${user.role})`);
      console.log(`   Active: ${user.is_active}, 2FA: ${user.two_fa_enabled}`);
      console.log(`   Password hash: ${user.password_hash ? 'Set' : 'Not set'}`);
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSupabaseUsers();
