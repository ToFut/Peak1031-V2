const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('SUPABASE_URL:', !!supabaseUrl);
  console.error('SUPABASE_SERVICE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsers() {
  try {
    console.log('🔍 Checking users in the system...');
    
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, role, created_at')
      .limit(10);
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }
    
    console.log('✅ Users found:', users.length);
    users.forEach(user => {
      console.log(`- ${user.email} (${user.role}) - ${user.id}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUsers();
