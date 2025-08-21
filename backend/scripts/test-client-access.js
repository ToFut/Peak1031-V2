const supabaseService = require('../services/supabase');
const rbacService = require('../services/rbacService');

async function testClientAccess() {
  const exchangeId = "d0ff9efc-c9c8-431e-83fa-e48661d10ef1";
  const userEmail = "client@peak1031.com";
  
  console.log('🧪 Testing client access for:', { exchangeId, userEmail });
  
  // 1. Get the user
  const { data: user, error: userError } = await supabaseService.client
    .from('users')
    .select('*')
    .eq('email', userEmail)
    .single();
    
  if (userError) {
    console.log('❌ User not found:', userError);
    return;
  }
  
  console.log('✅ User found:', {
    id: user.id,
    email: user.email,
    role: user.role,
    contact_id: user.contact_id
  });
  
  // 2. Test RBAC access
  console.log('\n🔐 Testing RBAC access...');
  try {
    const hasAccess = await rbacService.canUserAccessExchange(user, exchangeId);
    console.log('✅ RBAC Result:', hasAccess);
    
    if (hasAccess) {
      console.log('🎉 Client has access to the exchange!');
    } else {
      console.log('❌ Client does not have access to the exchange');
    }
  } catch (error) {
    console.log('❌ Error testing access:', error.message);
  }
  
  // 3. Check exchange participants
  console.log('\n📊 Checking exchange participants...');
  const { data: participants, error: participantsError } = await supabaseService.client
    .from('exchange_participants')
    .select('*')
    .eq('exchange_id', exchangeId)
    .eq('is_active', true);
    
  if (participantsError) {
    console.log('❌ Error fetching participants:', participantsError);
  } else {
    console.log('📊 Participants found:', participants?.length || 0);
    participants?.forEach(p => {
      const isUser = p.user_id === user.id;
      const isContact = p.contact_id === user.contact_id;
      console.log(`   - ${p.role}: user_id=${p.user_id}, contact_id=${p.contact_id} ${isUser ? '(USER MATCH)' : ''} ${isContact ? '(CONTACT MATCH)' : ''}`);
    });
  }
  
  // 4. Check exchange client_id
  console.log('\n🏢 Checking exchange client_id...');
  const { data: exchange, error: exchangeError } = await supabaseService.client
    .from('exchanges')
    .select('client_id')
    .eq('id', exchangeId)
    .single();
    
  if (exchangeError) {
    console.log('❌ Error fetching exchange:', exchangeError);
  } else {
    console.log('📋 Exchange client_id:', exchange.client_id);
    console.log('👤 User contact_id:', user.contact_id);
    console.log('🔗 Match:', exchange.client_id === user.contact_id ? 'YES' : 'NO');
  }
}

// Run the test
testClientAccess().catch(console.error);


