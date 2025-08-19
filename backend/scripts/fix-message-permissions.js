const supabaseService = require('../services/supabase');

/**
 * Fix script for message viewing permission issues
 * Run with: node backend/scripts/fix-message-permissions.js <user_email> <exchange_id>
 */

async function fixMessagePermissions(userEmail, exchangeId) {
  console.log('🔧 Fixing message permissions...');
  console.log('User email:', userEmail);
  console.log('Exchange ID:', exchangeId);
  console.log('');

  try {
    // 1. Find the user
    const { data: user, error: userError } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', userEmail)
      .single();

    if (userError || !user) {
      console.log('❌ User not found:', userError?.message || 'No user found');
      return;
    }

    console.log('✅ User found:', user.email, 'Role:', user.role);

    // 2. Find or create contact record
    let contactId = null;
    const { data: contacts, error: contactsError } = await supabaseService.client
      .from('contacts')
      .select('*')
      .eq('email', userEmail);

    if (contactsError) {
      console.log('❌ Error fetching contacts:', contactsError.message);
      return;
    }

    if (!contacts || contacts.length === 0) {
      // Create contact record for the user
      console.log('📝 Creating contact record for user...');
      const { data: newContact, error: createError } = await supabaseService.client
        .from('contacts')
        .insert({
          first_name: user.first_name || 'Unknown',
          last_name: user.last_name || 'User',
          email: user.email,
          pp_contact_id: `manual_${user.id}`,
          pp_data: {}
        })
        .select()
        .single();

      if (createError) {
        console.log('❌ Error creating contact:', createError.message);
        return;
      }

      contactId = newContact.id;
      console.log('✅ Created contact record:', contactId);
    } else {
      contactId = contacts[0].id;
      console.log('✅ Using existing contact record:', contactId);
    }

    // 3. Check if user is already a participant
    const { data: existingParticipant, error: participantError } = await supabaseService.client
      .from('exchange_participants')
      .select('*')
      .eq('exchange_id', exchangeId)
      .or(`user_id.eq.${user.id},contact_id.eq.${contactId}`)
      .eq('is_active', true)
      .single();

    if (participantError && participantError.code !== 'PGRST116') {
      console.log('❌ Error checking participants:', participantError.message);
      return;
    }

    if (existingParticipant) {
      console.log('✅ User is already a participant');
      
      // Update permissions if needed
      let permissions = existingParticipant.permissions || {};
      if (typeof permissions === 'string') {
        try {
          permissions = JSON.parse(permissions);
        } catch (error) {
          permissions = {};
        }
      }

      if (!permissions.can_view_messages) {
        console.log('🔧 Updating participant permissions...');
        permissions.can_view_messages = true;
        
        const { error: updateError } = await supabaseService.client
          .from('exchange_participants')
          .update({ permissions })
          .eq('id', existingParticipant.id);

        if (updateError) {
          console.log('❌ Error updating permissions:', updateError.message);
          return;
        }

        console.log('✅ Updated participant permissions');
      } else {
        console.log('✅ Participant already has message viewing permission');
      }
    } else {
      // 4. Create participant record
      console.log('📝 Creating participant record...');
      
      const defaultPermissions = getDefaultPermissionsForRole(user.role);
      const participantData = {
        exchange_id: exchangeId,
        role: user.role,
        permissions: defaultPermissions,
        is_active: true
      };

      // Add either user_id or contact_id based on role
      if (['admin', 'coordinator'].includes(user.role)) {
        participantData.user_id = user.id;
      } else {
        participantData.contact_id = contactId;
      }

      const { data: newParticipant, error: createParticipantError } = await supabaseService.client
        .from('exchange_participants')
        .insert(participantData)
        .select()
        .single();

      if (createParticipantError) {
        console.log('❌ Error creating participant:', createParticipantError.message);
        return;
      }

      console.log('✅ Created participant record:', newParticipant.id);
    }

    // 5. Verify the fix
    console.log('');
    console.log('🔍 Verifying fix...');
    
    const { debugMessagePermissions } = require('./debug-message-permissions');
    await debugMessagePermissions(userEmail, exchangeId);

    console.log('');
    console.log('✅ Message permissions fix completed!');

  } catch (error) {
    console.error('❌ Error during fix:', error);
  }
}

function getDefaultPermissionsForRole(role) {
  const defaults = {
    admin: {
      can_edit: true,
      can_delete: true,
      can_add_participants: true,
      can_upload_documents: true,
      can_send_messages: true,
      can_view_overview: true,
      can_view_messages: true,
      can_view_tasks: true,
      can_create_tasks: true,
      can_edit_tasks: true,
      can_assign_tasks: true,
      can_view_documents: true,
      can_edit_documents: true,
      can_delete_documents: true,
      can_view_participants: true,
      can_manage_participants: true,
      can_view_financial: true,
      can_edit_financial: true,
      can_view_timeline: true,
      can_edit_timeline: true,
      can_view_reports: true
    },
    coordinator: {
      can_edit: true,
      can_delete: false,
      can_add_participants: true,
      can_upload_documents: true,
      can_send_messages: true,
      can_view_overview: true,
      can_view_messages: true,
      can_view_tasks: true,
      can_create_tasks: true,
      can_edit_tasks: true,
      can_assign_tasks: true,
      can_view_documents: true,
      can_edit_documents: true,
      can_delete_documents: false,
      can_view_participants: true,
      can_manage_participants: true,
      can_view_financial: true,
      can_edit_financial: true,
      can_view_timeline: true,
      can_edit_timeline: true,
      can_view_reports: true
    },
    client: {
      can_edit: true,
      can_delete: false,
      can_add_participants: true,
      can_upload_documents: true,
      can_send_messages: true,
      can_view_overview: true,
      can_view_messages: true,
      can_view_tasks: true,
      can_create_tasks: true,
      can_edit_tasks: true,
      can_assign_tasks: true,
      can_view_documents: true,
      can_edit_documents: true,
      can_delete_documents: false,
      can_view_participants: true,
      can_manage_participants: true,
      can_view_financial: true,
      can_edit_financial: true,
      can_view_timeline: true,
      can_edit_timeline: true,
      can_view_reports: true
    },
    third_party: {
      can_edit: false,
      can_delete: false,
      can_add_participants: false,
      can_upload_documents: false,
      can_send_messages: false,
      can_view_overview: true,
      can_view_messages: false,
      can_view_tasks: false,
      can_create_tasks: false,
      can_edit_tasks: false,
      can_assign_tasks: false,
      can_view_documents: false,
      can_edit_documents: false,
      can_delete_documents: false,
      can_view_participants: false,
      can_manage_participants: false,
      can_view_financial: false,
      can_edit_financial: false,
      can_view_timeline: false,
      can_edit_timeline: false,
      can_view_reports: false
    },
    agency: {
      can_edit: false,
      can_delete: false,
      can_add_participants: false,
      can_upload_documents: false,
      can_send_messages: false,
      can_view_overview: true,
      can_view_messages: false,
      can_view_tasks: false,
      can_create_tasks: false,
      can_edit_tasks: false,
      can_assign_tasks: false,
      can_view_documents: false,
      can_edit_documents: false,
      can_delete_documents: false,
      can_view_participants: false,
      can_manage_participants: false,
      can_view_financial: false,
      can_edit_financial: false,
      can_view_timeline: false,
      can_edit_timeline: false,
      can_view_reports: false
    }
  };

  return defaults[role] || {
    can_edit: false,
    can_delete: false,
    can_add_participants: false,
    can_upload_documents: false,
    can_send_messages: false,
    can_view_overview: false,
    can_view_messages: false,
    can_view_tasks: false,
    can_create_tasks: false,
    can_edit_tasks: false,
    can_assign_tasks: false,
    can_view_documents: false,
    can_edit_documents: false,
    can_delete_documents: false,
    can_view_participants: false,
    can_manage_participants: false,
    can_view_financial: false,
    can_edit_financial: false,
    can_view_timeline: false,
    can_edit_timeline: false,
    can_view_reports: false
  };
}

// Run the script if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.length !== 2) {
    console.log('Usage: node fix-message-permissions.js <user_email> <exchange_id>');
    process.exit(1);
  }

  const [userEmail, exchangeId] = args;
  fixMessagePermissions(userEmail, exchangeId)
    .then(() => {
      console.log('Fix complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fix failed:', error);
      process.exit(1);
    });
}

module.exports = { fixMessagePermissions };

