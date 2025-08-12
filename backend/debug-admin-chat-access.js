const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugAdminChatAccess() {
  console.log('🔍 Debugging admin chat access...\n');
  
  const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
  const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
  
  // 1. Check if admin can access the specific exchange
  const { data: exchange, error: exchangeError } = await supabase
    .from('exchanges')
    .select(`
      *,
      exchange_participants (
        *,
        contact:contacts!exchange_participants_contact_id_fkey (*)
      )
    `)
    .eq('id', exchangeId)
    .single();
    
  if (exchangeError) {
    console.error('Error fetching exchange:', exchangeError);
    return;
  }
  
  console.log('Exchange details:');
  console.log('- Name:', exchange.name);
  console.log('- Status:', exchange.status);
  console.log('- Coordinator ID:', exchange.coordinator_id);
  console.log('- Is Active:', exchange.is_active);
  console.log('- Participants:', exchange.exchange_participants?.length || 0);
  
  // 2. Check if admin is a participant
  const adminParticipant = exchange.exchange_participants?.find(p => 
    p.contact_id === adminUserId
  );
  
  console.log('\nAdmin participant status:');
  if (adminParticipant) {
    console.log('✅ Admin is a participant');
    console.log('- Role:', adminParticipant.role);
    console.log('- Permissions:', adminParticipant.permissions);
  } else {
    console.log('❌ Admin is NOT a participant');
  }
  
  // 3. Check admin access as coordinator
  if (exchange.coordinator_id === adminUserId) {
    console.log('✅ Admin is the coordinator');
  } else {
    console.log('❌ Admin is NOT the coordinator');
  }
  
  // 4. Check messages in the exchange
  const { data: messages, count } = await supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('exchange_id', exchangeId)
    .order('created_at', { ascending: false })
    .limit(5);
    
  console.log('\nMessages in exchange:', count || 0);
  if (messages && messages.length > 0) {
    console.log('Recent messages:');
    messages.forEach(msg => {
      console.log(`- ${msg.created_at}: ${msg.content.substring(0, 50)}...`);
    });
  }
  
  // 5. Check what the chat service would return for admin
  console.log('\n📋 Simulating chat service exchange query for admin...');
  
  // Simulate the query from chatService.getExchanges
  const { data: adminExchanges } = await supabase
    .from('exchanges')
    .select(`
      id,
      name,
      status,
      created_at,
      exchange_participants!inner (
        contact:contacts!exchange_participants_contact_id_fkey (
          id,
          first_name,
          last_name,
          email,
          phone,
          user_id
        )
      )
    `)
    .or(`coordinator_id.eq.${adminUserId},exchange_participants.contact_id.eq.${adminUserId}`)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(50);
    
  console.log('Admin has access to', adminExchanges?.length || 0, 'exchanges');
  
  const hasSegev = adminExchanges?.some(ex => ex.id === exchangeId);
  console.log('SEGEV DEMO in admin chat list:', hasSegev ? '✅ Yes' : '❌ No');
  
  if (!hasSegev && adminExchanges) {
    console.log('\n⚠️  Admin cannot see SEGEV DEMO in chat!');
    console.log('Possible reasons:');
    console.log('1. Admin is not a participant (no contact with user_id)');
    console.log('2. Exchange is not active');
    console.log('3. Query conditions not met');
  }
}

debugAdminChatAccess();