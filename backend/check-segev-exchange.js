const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSegevExchange() {
  console.log('🔍 Checking SEGEV DEMO exchange...\n');
  
  const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
  
  // Get exchange details
  const { data: exchange, error } = await supabase
    .from('exchanges')
    .select('*')
    .eq('id', exchangeId)
    .single();
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('Exchange details:');
  console.log('- ID:', exchange.id);
  console.log('- Name:', exchange.name);
  console.log('- Status:', exchange.status);
  console.log('- Is Active:', exchange.is_active);
  console.log('- Client ID:', exchange.client_id);
  console.log('- Coordinator ID:', exchange.coordinator_id);
  console.log('- Created:', exchange.created_at);
  
  // Check why it might not appear for admin
  if (!exchange.is_active) {
    console.log('\n⚠️  Exchange is INACTIVE - this might be why admin can\'t see it');
  }
  
  // Get participants - try different approaches
  const { data: participants } = await supabase
    .from('exchange_participants')
    .select('*')
    .eq('exchange_id', exchangeId);
    
  const { data: allParticipants } = await supabase
    .from('exchange_participants')
    .select('*')
    .limit(5);
    
  console.log('\nParticipants for this exchange:', participants?.length || 0);
  participants?.forEach(p => {
    console.log(`- Role: ${p.role}, User ID: ${p.user_id}, Contact ID: ${p.contact_id}`);
  });
  
  console.log('\nSample participants from other exchanges:');
  allParticipants?.forEach(p => {
    console.log(`- Exchange: ${p.exchange_id.substring(0, 8)}..., Role: ${p.role}`);
  });
  
  // Check messages
  const { data: messages } = await supabase
    .from('messages')
    .select('id, content, created_at')
    .eq('exchange_id', exchangeId)
    .order('created_at', { ascending: false })
    .limit(3);
    
  console.log('\nRecent messages:', messages?.length || 0);
  messages?.forEach(m => {
    console.log(`- ${m.content.substring(0, 50)}...`);
  });
}

checkSegevExchange();