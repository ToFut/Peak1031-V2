const supabaseService = require('../services/supabase');
const rbacService = require('../services/rbacService');

/**
 * Debug script to identify message viewing permission issues
 * Run with: node backend/scripts/debug-message-permissions.js <user_email> <exchange_id>
 */

async function debugMessagePermissions(userEmail, exchangeId) {
  console.log('🔍 Debugging message permissions...');
  console.log('User email:', userEmail);
  console.log('Exchange ID:', exchangeId);
  console.log('');

  try {
    // 1. Find the user
    console.log('1. Finding user...');
    const { data: user, error: userError } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.log('❌ User not found:', userError?.message || 'No user found');
      return;
    }

    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    });
    console.log('');

    // 2. Check if exchange exists
    console.log('2. Checking exchange...');
    const { data: exchange, error: exchangeError } = await supabaseService.client
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    if (exchangeError || !exchange) {
      console.log('❌ Exchange not found:', exchangeError?.message || 'No exchange found');
      return;
    }

    console.log('✅ Exchange found:', {
      id: exchange.id,
      name: exchange.name,
      client_id: exchange.client_id,
      coordinator_id: exchange.coordinator_id,
      status: exchange.status
    });
    console.log('');

    // 3. Check user's contact relationship
    console.log('3. Checking user-contact relationship...');
    const { data: contacts, error: contactsError } = await supabaseService.client
      .from('contacts')
      .select('*')
      .eq('email', userEmail);

    if (contactsError) {
      console.log('❌ Error fetching contacts:', contactsError.message);
    } else if (!contacts || contacts.length === 0) {
      console.log('⚠️  No contact record found for user email');
    } else {
      console.log('✅ Contact records found:', contacts.length);
      contacts.forEach((contact, index) => {
        console.log(`   Contact ${index + 1}:`, {
          id: contact.id,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          pp_contact_id: contact.pp_contact_id
        });
      });
    }
    console.log('');

    // 4. Check exchange participants
    console.log('4. Checking exchange participants...');
    const { data: participants, error: participantsError } = await supabaseService.client
      .from('exchange_participants')
      .select('*')
      .eq('exchange_id', exchangeId)
      .eq('is_active', true);

    if (participantsError) {
      console.log('❌ Error fetching participants:', participantsError.message);
    } else {
      console.log('✅ Exchange participants:', participants?.length || 0);
      
      if (participants && participants.length > 0) {
        participants.forEach((participant, index) => {
          console.log(`   Participant ${index + 1}:`, {
            id: participant.id,
            user_id: participant.user_id,
            contact_id: participant.contact_id,
            role: participant.role,
            permissions: participant.permissions
          });
        });
      } else {
        console.log('⚠️  No active participants found');
      }
    }
    console.log('');

    // 5. Check if user is a participant
    console.log('5. Checking if user is a participant...');
    let userParticipant = null;
    
    // Check by user_id
    if (participants) {
      userParticipant = participants.find(p => p.user_id === user.id);
      if (userParticipant) {
        console.log('✅ User is participant by user_id:', {
          participant_id: userParticipant.id,
          role: userParticipant.role,
          permissions: userParticipant.permissions
        });
      }
    }

    // Check by contact_id if no user_id match
    if (!userParticipant && contacts && contacts.length > 0) {
      const contactIds = contacts.map(c => c.id);
      userParticipant = participants?.find(p => 
        p.contact_id && contactIds.includes(p.contact_id)
      );
      
      if (userParticipant) {
        console.log('✅ User is participant by contact_id:', {
          participant_id: userParticipant.id,
          contact_id: userParticipant.contact_id,
          role: userParticipant.role,
          permissions: userParticipant.permissions
        });
      }
    }

    if (!userParticipant) {
      console.log('❌ User is not a participant in this exchange');
    }
    console.log('');

    // 6. Check RBAC access
    console.log('6. Checking RBAC access...');
    const hasAccess = await rbacService.canUserAccessExchange(user, exchangeId);
    console.log('RBAC canUserAccessExchange result:', hasAccess);

    // Get user's accessible exchanges
    const { data: accessibleExchanges } = await rbacService.getExchangesForUser(user);
    const canAccessThisExchange = accessibleExchanges.some(ex => ex.id === exchangeId);
    console.log('User can access this exchange via RBAC:', canAccessThisExchange);
    console.log('Total accessible exchanges:', accessibleExchanges.length);
    console.log('');

    // 7. Check message viewing permission
    console.log('7. Checking message viewing permission...');
    if (userParticipant) {
      let permissions = {};
      try {
        permissions = typeof userParticipant.permissions === 'string' 
          ? JSON.parse(userParticipant.permissions)
          : userParticipant.permissions || {};
      } catch (error) {
        console.log('❌ Error parsing participant permissions:', error.message);
      }

      const canViewMessages = permissions.can_view_messages === true;
      console.log('Participant can_view_messages permission:', canViewMessages);
      console.log('All participant permissions:', permissions);
    } else {
      // Check role-based defaults
      const defaultPermissions = rbacService.getDefaultPermissionsForRole(user.role);
      const canViewMessages = defaultPermissions.can_view_messages === true;
      console.log('Role-based can_view_messages permission:', canViewMessages);
      console.log('Role-based permissions for', user.role + ':', defaultPermissions);
    }
    console.log('');

    // 8. Summary and recommendations
    console.log('8. Summary and recommendations...');
    console.log('='.repeat(50));
    
    if (!userParticipant && !canAccessThisExchange) {
      console.log('❌ ISSUE: User has no access to this exchange');
      console.log('   - User is not a participant');
      console.log('   - User cannot access via RBAC');
      console.log('');
      console.log('🔧 RECOMMENDATIONS:');
      console.log('   1. Add user as participant to exchange_participants table');
      console.log('   2. Ensure user has proper contact record if client role');
      console.log('   3. Check if user should be coordinator of this exchange');
    } else if (userParticipant && !userParticipant.permissions?.can_view_messages) {
      console.log('❌ ISSUE: User is participant but lacks message viewing permission');
      console.log('🔧 RECOMMENDATION: Update participant permissions to include can_view_messages: true');
    } else if (canAccessThisExchange) {
      console.log('✅ User should have access via RBAC');
      console.log('🔧 Check if there are any middleware issues blocking access');
    } else {
      console.log('❌ ISSUE: User is participant but RBAC denies access');
      console.log('🔧 RECOMMENDATION: Check RBAC service logic for this user role');
    }

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

// Run the script if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.log('Usage: node debug-message-permissions.js <user_email> <exchange_id>');
    process.exit(1);
  }

  const [userEmail, exchangeId] = args;
  debugMessagePermissions(userEmail, exchangeId)
    .then(() => {
      console.log('Debug complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugMessagePermissions };


