const supabaseService = require('../services/supabase');
const rbacService = require('../services/rbacService');

async function debugClientAccess() {
  const exchangeId = "d0ff9efc-c9c8-431e-83fa-e48661d10ef1";
  
  console.log('🔍 Debugging client access for exchange:', exchangeId);
  
  // 1. Check the exchange exists
  console.log('\n1. Checking exchange exists...');
  const { data: exchange, error: exchangeError } = await supabaseService.client
    .from('exchanges')
    .select('*')
    .eq('id', exchangeId)
    .single();
    
  if (exchangeError) {
    console.log('❌ Exchange not found:', exchangeError);
    return;
  }
  
  console.log('✅ Exchange found:', {
    id: exchange.id,
    name: exchange.name,
    client_id: exchange.client_id,
    coordinator_id: exchange.coordinator_id,
    status: exchange.status
  });
  
  // 2. Check exchange participants
  console.log('\n2. Checking exchange participants...');
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
      console.log(`   - ${p.role}: user_id=${p.user_id}, contact_id=${p.contact_id}`);
    });
  }
  
  // 3. Check all users with client role
  console.log('\n3. Checking users with client role...');
  const { data: clientUsers, error: clientUsersError } = await supabaseService.client
    .from('users')
    .select('id, email, role, contact_id')
    .eq('role', 'client');
    
  if (clientUsersError) {
    console.log('❌ Error fetching client users:', clientUsersError);
  } else {
    console.log('👥 Client users found:', clientUsers?.length || 0);
    clientUsers?.forEach(u => {
      console.log(`   - ${u.email}: id=${u.id}, contact_id=${u.contact_id}`);
    });
  }
  
  // 4. Check contacts table
  console.log('\n4. Checking contacts...');
  const { data: contacts, error: contactsError } = await supabaseService.client
    .from('contacts')
    .select('id, first_name, last_name, email, user_id');
    
  if (contactsError) {
    console.log('❌ Error fetching contacts:', contactsError);
  } else {
    console.log('📇 Contacts found:', contacts?.length || 0);
    contacts?.slice(0, 5).forEach(c => {
      console.log(`   - ${c.first_name} ${c.last_name} (${c.email}): id=${c.id}, user_id=${c.user_id}`);
    });
  }
  
  // 5. Test RBAC for each client user
  console.log('\n5. Testing RBAC access for each client user...');
  for (const clientUser of clientUsers || []) {
    console.log(`\n   Testing access for ${clientUser.email}...`);
    
    try {
      const hasAccess = await rbacService.canUserAccessExchange(clientUser, exchangeId);
      console.log(`   ✅ ${clientUser.email}: hasAccess = ${hasAccess}`);
      
      if (hasAccess) {
        console.log(`   🎯 Found user with access: ${clientUser.email}`);
        console.log(`   📋 User details:`, clientUser);
        break;
      }
    } catch (error) {
      console.log(`   ❌ Error testing access for ${clientUser.email}:`, error.message);
    }
  }
  
  // 6. Check if exchange has any participants at all
  console.log('\n6. Checking if exchange has any participants...');
  const { data: allParticipants, error: allParticipantsError } = await supabaseService.client
    .from('exchange_participants')
    .select('*')
    .eq('exchange_id', exchangeId);
    
  if (allParticipantsError) {
    console.log('❌ Error fetching all participants:', allParticipantsError);
  } else {
    console.log('📊 All participants (including inactive):', allParticipants?.length || 0);
    allParticipants?.forEach(p => {
      console.log(`   - ${p.role}: user_id=${p.user_id}, contact_id=${p.contact_id}, is_active=${p.is_active}`);
    });
  }
}

// Run the debug function
debugClientAccess().catch(console.error);


