require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkUsers() {
  console.log('🔍 Checking users in the database...\n');

  try {
    // Get all active users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active, created_at')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Users fetch error:', error);
      return;
    }

    console.log(`Found ${users.length} active users:\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

    // Also check if there are any recent login attempts or auth logs
    console.log('\n🔐 Recent messages that might be causing the 500 error:');
    const { data: recentMessages, error: msgError } = await supabase
      .from('messages')
      .select('id, exchange_id, sender_id, read_by, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (!msgError && recentMessages) {
      console.log('\nRecent messages:');
      recentMessages.forEach((msg, index) => {
        console.log(`${index + 1}. Message ID: ${msg.id}`);
        console.log(`   Exchange: ${msg.exchange_id}`);
        console.log(`   Sender: ${msg.sender_id}`);
        console.log(`   Read by: ${JSON.stringify(msg.read_by)}`);
        console.log(`   Created: ${msg.created_at}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkUsers().then(() => {
  console.log('✅ User check completed');
  process.exit(0);
}).catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});