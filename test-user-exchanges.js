require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testUserExchanges() {
  // First get a user to test with
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  if (userError || !users?.length) {
    console.error('No users found');
    return;
  }

  const testUser = users[0];
  console.log('Testing with user:', testUser.email, '(role:', testUser.role, ')');

  // Check exchanges where user is coordinator
  console.log('\n1. Exchanges where user is coordinator:');
  const { data: coordExchanges, error: coordError } = await supabase
    .from('exchanges')
    .select('*')
    .eq('coordinator_id', testUser.id);
  
  if (coordError) {
    console.error('Error:', coordError);
  } else {
    console.log('Found', coordExchanges?.length || 0, 'exchanges');
  }

  // Check exchanges where user is in exchange_participants
  console.log('\n2. Exchanges where user is participant:');
  const { data: participants, error: partError } = await supabase
    .from('exchange_participants')
    .select(`
      *,
      exchanges (*)
    `)
    .eq('user_id', testUser.id);
  
  if (partError) {
    console.error('Error:', partError);
  } else {
    console.log('Found', participants?.length || 0, 'participant records');
  }

  // Check all exchanges (admin view)
  console.log('\n3. All exchanges (for admin):');
  const { data: allExchanges, error: allError } = await supabase
    .from('exchanges')
    .select('id, name, status')
    .limit(5);
  
  if (allError) {
    console.error('Error:', allError);
  } else {
    console.log('Total exchanges:', allExchanges?.length || 0);
    allExchanges?.forEach(ex => {
      console.log(`- ${ex.name} (${ex.status})`);
    });
  }

  // Try the chatService query approach
  console.log('\n4. Using chatService query (all exchanges with messages):');
  const { data: exchangesWithMessages, error: chatError } = await supabase
    .from('exchanges')
    .select(`
      id,
      name,
      status,
      messages (
        id,
        content,
        sender_id,
        created_at,
        read_by
      )
    `)
    .order('created_at', { ascending: false });
  
  if (chatError) {
    console.error('Error:', chatError);
  } else {
    console.log('Found', exchangesWithMessages?.length || 0, 'exchanges');
    exchangesWithMessages?.forEach(ex => {
      console.log(`- ${ex.name}: ${ex.messages?.length || 0} messages`);
    });
  }
}

testUserExchanges();