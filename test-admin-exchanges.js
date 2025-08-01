require('dotenv').config({ path: './backend/.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function testAdminExchanges() {
  console.log('Testing admin access to exchanges...\n');

  // 1. Get admin user
  const { data: adminUser, error: adminError } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'admin')
    .single();
  
  if (adminError || !adminUser) {
    console.error('No admin user found:', adminError);
    return;
  }

  console.log('Admin user:', adminUser.email, '(ID:', adminUser.id, ')');

  // 2. Check all exchanges
  console.log('\n2. All exchanges in database:');
  const { data: allExchanges, error: allError } = await supabase
    .from('exchanges')
    .select('id, name, status, coordinator_id, client_id');
  
  if (allError) {
    console.error('Error:', allError);
  } else {
    console.log('Total exchanges:', allExchanges?.length || 0);
    allExchanges?.forEach(ex => {
      console.log(`- ${ex.name} (${ex.status})`);
      console.log(`  Coordinator: ${ex.coordinator_id}`);
      console.log(`  Client: ${ex.client_id}`);
    });
  }

  // 3. Check if admin is a participant
  console.log('\n3. Checking if admin is in exchange_participants:');
  const { data: adminParticipant, error: partError } = await supabase
    .from('exchange_participants')
    .select('*')
    .eq('user_id', adminUser.id);
  
  if (partError) {
    console.error('Error:', partError);
  } else {
    console.log('Admin participant records:', adminParticipant?.length || 0);
  }

  // 4. Check if admin is coordinator of any exchanges
  console.log('\n4. Exchanges where admin is coordinator:');
  const { data: coordExchanges, error: coordError } = await supabase
    .from('exchanges')
    .select('*')
    .eq('coordinator_id', adminUser.id);
  
  if (coordError) {
    console.error('Error:', coordError);
  } else {
    console.log('Found:', coordExchanges?.length || 0);
  }

  // 5. Test the exact query from chatService
  console.log('\n5. Testing chatService query:');
  const { data: chatServiceResult, error: chatError } = await supabase
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
    console.error('Chat service query error:', chatError);
  } else {
    console.log('Chat service query returned:', chatServiceResult?.length || 0, 'exchanges');
    
    // Check if this matches what we expect
    if (chatServiceResult?.length > 0) {
      console.log('\nFirst exchange from chat service query:');
      console.log('- Name:', chatServiceResult[0].name);
      console.log('- Status:', chatServiceResult[0].status);
      console.log('- Messages:', chatServiceResult[0].messages?.length || 0);
    }
  }

  // 6. Solution: Add admin as participant to all exchanges
  console.log('\n6. SOLUTION: Should we add admin as participant to all exchanges?');
  console.log('Admin users typically should see all exchanges.');
  console.log('Options:');
  console.log('a) Add admin to exchange_participants table for all exchanges');
  console.log('b) Modify the frontend to show all exchanges for admin role');
  console.log('c) Make admin the coordinator of exchanges');
}

testAdminExchanges();