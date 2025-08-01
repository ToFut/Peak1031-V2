const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://ynwfrmykghcozqnuszho.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlud2ZybXlrZ2hjb3pxbnVzemhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzczNjI2NSwiZXhwIjoyMDY5MzEyMjY1fQ.mYT5SDtRDQhwXgPKz4q1j1g4SL8GVBBLHyKqKxIL4dE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...\n');

  try {
    // 1. Check exchanges
    console.log('1. Checking exchanges:');
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select('*')
      .limit(5);
    
    if (exchangesError) {
      console.error('Error fetching exchanges:', exchangesError);
    } else {
      console.log(`Found ${exchanges?.length || 0} exchanges`);
      if (exchanges?.length > 0) {
        console.log('Sample exchange:', exchanges[0]);
      }
    }

    // 2. Check exchange participants
    console.log('\n2. Checking exchange participants:');
    const { data: participants, error: participantsError } = await supabase
      .from('exchange_participants')
      .select('*')
      .limit(10);
    
    if (participantsError) {
      console.error('Error fetching participants:', participantsError);
    } else {
      console.log(`Found ${participants?.length || 0} participants`);
      if (participants?.length > 0) {
        console.log('Sample participant:', participants[0]);
      }
    }

    // 3. Check messages
    console.log('\n3. Checking messages:');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(10);
    
    if (messagesError) {
      console.error('Error fetching messages:', messagesError);
    } else {
      console.log(`Found ${messages?.length || 0} messages`);
      if (messages?.length > 0) {
        console.log('Sample message:', messages[0]);
      }
    }

    // 4. Check users
    console.log('\n4. Checking users:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log(`Found ${users?.length || 0} users`);
      if (users?.length > 0) {
        console.log('Sample user:', { 
          id: users[0].id, 
          email: users[0].email, 
          role: users[0].role,
          first_name: users[0].first_name,
          last_name: users[0].last_name
        });
      }
    }

    // 5. Check if there are exchanges with participants
    console.log('\n5. Checking exchanges with participants:');
    const { data: exchangesWithParticipants, error: ewpError } = await supabase
      .from('exchanges')
      .select(`
        *,
        exchange_participants (*)
      `)
      .limit(5);
    
    if (ewpError) {
      console.error('Error fetching exchanges with participants:', ewpError);
    } else {
      console.log(`Found ${exchangesWithParticipants?.length || 0} exchanges`);
      exchangesWithParticipants?.forEach((exchange, i) => {
        console.log(`Exchange ${i + 1}: ${exchange.exchange_name || exchange.name} - ${exchange.exchange_participants?.length || 0} participants`);
      });
    }

    // 6. Check messages with senders
    console.log('\n6. Checking messages with senders:');
    const { data: messagesWithSenders, error: mwsError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey (
          id,
          first_name,
          last_name,
          email
        )
      `)
      .limit(5);
    
    if (mwsError) {
      console.error('Error fetching messages with senders:', mwsError);
    } else {
      console.log(`Found ${messagesWithSenders?.length || 0} messages with senders`);
      messagesWithSenders?.forEach((msg, i) => {
        console.log(`Message ${i + 1}: "${msg.content?.substring(0, 50)}..." by ${msg.sender?.first_name || 'Unknown'} ${msg.sender?.last_name || ''}`);
      });
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the test
testSupabaseConnection();