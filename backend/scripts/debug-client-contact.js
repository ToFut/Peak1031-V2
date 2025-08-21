const supabaseService = require('../services/supabase');

async function debugClientContact() {
  const userEmail = "client@peak1031.com";
  
  console.log('🔍 Debugging client contact relationship for:', userEmail);
  
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
  
  // 2. Check if the contact exists
  if (user.contact_id) {
    const { data: contact, error: contactError } = await supabaseService.client
      .from('contacts')
      .select('*')
      .eq('id', user.contact_id)
      .single();
      
    if (contactError) {
      console.log('❌ Contact not found:', contactError);
    } else {
      console.log('✅ Contact found:', {
        id: contact.id,
        first_name: contact.first_name,
        last_name: contact.last_name,
        email: contact.email
      });
    }
  } else {
    console.log('⚠️ User has no contact_id');
  }
  
  // 3. Check if there's a contact with the same email
  const { data: contactsByEmail, error: emailError } = await supabaseService.client
    .from('contacts')
    .select('*')
    .eq('email', userEmail);
    
  if (emailError) {
    console.log('❌ Error searching contacts by email:', emailError);
  } else {
    console.log('📧 Contacts with same email:', contactsByEmail?.length || 0);
    contactsByEmail?.forEach(c => {
      console.log(`   - ${c.first_name} ${c.last_name} (${c.id})`);
    });
  }
  
  // 4. Check exchange participants for this user
  const exchangeId = "d0ff9efc-c9c8-431e-83fa-e48661d10ef1";
  const { data: participants, error: participantsError } = await supabaseService.client
    .from('exchange_participants')
    .select('*')
    .eq('exchange_id', exchangeId)
    .eq('is_active', true);
    
  if (participantsError) {
    console.log('❌ Error fetching participants:', participantsError);
  } else {
    console.log('📊 Exchange participants:', participants?.length || 0);
    participants?.forEach(p => {
      const isUser = p.user_id === user.id;
      const isContact = p.contact_id === user.contact_id;
      console.log(`   - ${p.role}: user_id=${p.user_id}, contact_id=${p.contact_id} ${isUser ? '(USER MATCH)' : ''} ${isContact ? '(CONTACT MATCH)' : ''}`);
    });
  }
  
  // 5. Check if user should be linked to a contact
  if (user.contact_id) {
    console.log('\n🔗 User should be linked to contact:', user.contact_id);
  } else if (contactsByEmail && contactsByEmail.length > 0) {
    console.log('\n🔗 User should be linked to contact:', contactsByEmail[0].id);
    console.log('💡 The user.contact_id should be updated to:', contactsByEmail[0].id);
  } else {
    console.log('\n⚠️ No contact found for user - this might be the issue');
  }
}

// Run the debug function
debugClientContact().catch(console.error);


