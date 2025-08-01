require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Use the same credentials from .env
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

console.log('Testing Supabase connection with environment credentials...');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? 'Present (hidden)' : 'Missing');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMessages() {
  try {
    // 1. Test basic connection with users (which we know works)
    console.log('\n1. Testing connection with users table:');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(2);
    
    if (usersError) {
      console.error('Users error:', usersError);
    } else {
      console.log('✅ Users found:', users?.length || 0);
    }

    // 2. Check if messages table exists and has data
    console.log('\n2. Checking messages table:');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .limit(5);
    
    if (messagesError) {
      console.error('Messages error:', messagesError);
    } else {
      console.log('✅ Messages found:', messages?.length || 0);
      if (messages?.length > 0) {
        console.log('Sample message:', {
          id: messages[0].id,
          content: messages[0].content?.substring(0, 50) + '...',
          exchange_id: messages[0].exchange_id,
          sender_id: messages[0].sender_id,
          created_at: messages[0].created_at
        });
      }
    }

    // 3. Check exchanges with messages
    console.log('\n3. Checking exchanges with their messages:');
    const { data: exchangesWithMessages, error: ewmError } = await supabase
      .from('exchanges')
      .select(`
        id,
        exchange_name,
        status,
        messages (
          id,
          content,
          sender_id,
          created_at
        )
      `)
      .limit(3);
    
    if (ewmError) {
      console.error('Exchanges with messages error:', ewmError);
    } else {
      console.log('✅ Exchanges found:', exchangesWithMessages?.length || 0);
      exchangesWithMessages?.forEach((exchange, i) => {
        console.log(`\nExchange ${i + 1}: ${exchange.exchange_name || 'Unnamed'}`);
        console.log(`  - Status: ${exchange.status}`);
        console.log(`  - Messages: ${exchange.messages?.length || 0}`);
      });
    }

    // 4. Check exchange participants
    console.log('\n4. Checking exchange participants:');
    const { data: participants, error: participantsError } = await supabase
      .from('exchange_participants')
      .select(`
        *,
        exchanges (exchange_name),
        users (email, role)
      `)
      .limit(5);
    
    if (participantsError) {
      console.error('Participants error:', participantsError);
    } else {
      console.log('✅ Participants found:', participants?.length || 0);
      participants?.forEach((p, i) => {
        console.log(`Participant ${i + 1}:`, {
          exchange: p.exchanges?.exchange_name,
          user: p.users?.email,
          role: p.role
        });
      });
    }

    // 5. Try to insert a test message (if we have an exchange)
    if (exchangesWithMessages?.length > 0 && users?.length > 0) {
      console.log('\n5. Testing message insert:');
      const testExchange = exchangesWithMessages[0];
      const testUser = users[0];
      
      const { data: newMessage, error: insertError } = await supabase
        .from('messages')
        .insert({
          content: 'Test message from Node.js script',
          exchange_id: testExchange.id,
          sender_id: testUser.id,
          message_type: 'text',
          read_by: [testUser.id]
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Insert error:', insertError);
      } else {
        console.log('✅ Test message created:', newMessage.id);
        
        // Clean up - delete the test message
        const { error: deleteError } = await supabase
          .from('messages')
          .delete()
          .eq('id', newMessage.id);
        
        if (!deleteError) {
          console.log('✅ Test message cleaned up');
        }
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testMessages();