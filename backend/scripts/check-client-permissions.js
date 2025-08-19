const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkClientPermissions() {
  try {
    console.log('🔍 Checking client permissions...');
    
    // Check all client users
    const clientEmails = [
      'test-client@peak1031.com',
      'test-doc-client@peak1031.com', 
      'test-messaging-client@peak1031.com',
      'test@peak1031.com'
    ];
    
    for (const email of clientEmails) {
      console.log(`\n📋 Checking client: ${email}`);
      
      // Get user
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('email', email)
        .single();
      
      if (userError || !user) {
        console.log(`❌ User not found: ${email}`);
        continue;
      }
      
      console.log(`✅ User: ${user.email} (${user.role}) - ${user.id}`);
      
      // Get user's exchanges
      const { data: participants, error: participantsError } = await supabase
        .from('exchange_participants')
        .select(`
          id,
          exchange_id,
          is_active,
          permissions,
          exchanges (
            id,
            title,
            status
          )
        `)
        .eq('user_id', user.id);
      
      if (participantsError) {
        console.log(`❌ Error fetching participants: ${participantsError.message}`);
        continue;
      }
      
      console.log(`📊 Participating in ${participants.length} exchanges:`);
      
      for (const participant of participants) {
        console.log(`\n  Exchange: ${participant.exchanges?.title || participant.exchange_id}`);
        console.log(`  Exchange ID: ${participant.exchange_id}`);
        console.log(`  Is Active: ${participant.is_active}`);
        console.log(`  Permissions: ${JSON.stringify(participant.permissions)}`);
        
        // Check if can send messages
        const canSendMessages = participant.permissions && 
          participant.permissions.includes('can_send_messages');
        
        console.log(`  Can Send Messages: ${canSendMessages ? '✅' : '❌'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkClientPermissions();
