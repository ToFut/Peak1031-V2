const supabaseService = require('../services/supabase');

async function addUserToExchange() {
  const exchangeId = "d0ff9efc-c9c8-431e-83fa-e48661d10ef1";
  
  // Get the current user's email from command line or use a default
  const userEmail = process.argv[2] || 'test-client@peak1031.com';
  
  console.log('🔧 Adding user to exchange:', { exchangeId, userEmail });
  
  // 1. Find the user
  console.log('\n1. Finding user...');
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
  
  // 2. Check if user is already a participant
  console.log('\n2. Checking if user is already a participant...');
  const { data: existingParticipant, error: participantError } = await supabaseService.client
    .from('exchange_participants')
    .select('*')
    .eq('exchange_id', exchangeId)
    .eq('user_id', user.id)
    .single();
    
  if (existingParticipant) {
    console.log('⚠️ User is already a participant:', existingParticipant);
    return;
  }
  
  // 3. Add user as participant
  console.log('\n3. Adding user as participant...');
  const { data: newParticipant, error: addError } = await supabaseService.client
    .from('exchange_participants')
    .insert({
      exchange_id: exchangeId,
      user_id: user.id,
      contact_id: user.contact_id,
      role: user.role,
      permissions: ['view', 'upload', 'message'],
      is_active: true
    })
    .select()
    .single();
    
  if (addError) {
    console.log('❌ Error adding participant:', addError);
    return;
  }
  
  console.log('✅ User added as participant:', newParticipant);
  
  // 4. Verify the addition
  console.log('\n4. Verifying participant was added...');
  const { data: participants, error: verifyError } = await supabaseService.client
    .from('exchange_participants')
    .select('*')
    .eq('exchange_id', exchangeId)
    .eq('is_active', true);
    
  if (verifyError) {
    console.log('❌ Error verifying participants:', verifyError);
  } else {
    console.log('📊 Total participants now:', participants?.length || 0);
    participants?.forEach(p => {
      console.log(`   - ${p.role}: user_id=${p.user_id}, contact_id=${p.contact_id}`);
    });
  }
}

// Run the function
addUserToExchange().catch(console.error);
