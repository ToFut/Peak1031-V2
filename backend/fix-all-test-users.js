const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixTestUsersPasswords() {
  try {
    console.log('🔐 Fixing passwords for all test users...');
    
    const testUsers = [
      'admin@peak1031.com',
      'client@peak1031.com',
      'coordinator@peak1031.com',
      'thirdparty@peak1031.com',
      'agency@peak1031.com'
    ];
    
    const password = 'admin123';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    for (const email of testUsers) {
      console.log(`\n📧 Processing ${email}...`);
      
      // First check if user exists in users table
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();
      
      if (existingUser) {
        // Update existing user
        const { data, error } = await supabase
          .from('users')
          .update({ 
            password_hash: hashedPassword,
            is_active: true
          })
          .eq('email', email);
        
        if (error) {
          console.error(`❌ Error updating ${email}:`, error.message);
        } else {
          console.log(`✅ Password updated for ${email}`);
        }
      } else {
        console.log(`⚠️  User ${email} not found in users table`);
      }
    }
    
    console.log('\n✅ All test users processed');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixTestUsersPasswords();