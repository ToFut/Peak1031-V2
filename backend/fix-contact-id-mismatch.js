#!/usr/bin/env node

/**
 * Fix contact_id mismatches between users and participants
 * Updates participant records to use the correct user_id and contact_id
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function fixContactIdMismatch() {
  console.log('🔧 Fixing contact_id mismatches\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Find participants without user_id
    console.log('📋 Step 1: Finding participants without user_id...');
    const { data: orphaned } = await supabaseService.client
      .from('exchange_participants')
      .select('*')
      .is('user_id', null)
      .not('contact_id', 'is', null);

    if (!orphaned || orphaned.length === 0) {
      console.log('✅ No orphaned participant records found!');
      return;
    }

    console.log(`Found ${orphaned.length} participant records to check\n`);

    // Step 2: Process each orphaned record
    console.log('📋 Step 2: Processing each record...\n');
    
    let fixed = 0;
    let notFound = 0;
    let failed = 0;

    for (const participant of orphaned) {
      // Get the contact info
      const { data: contact } = await supabaseService.client
        .from('contacts')
        .select('email, first_name, last_name')
        .eq('id', participant.contact_id)
        .single();

      if (!contact) {
        console.log(`  ⚠️ No contact found for ID: ${participant.contact_id}`);
        notFound++;
        continue;
      }

      console.log(`\nProcessing: ${contact.first_name} ${contact.last_name} (${contact.email})`);
      console.log(`  Role: ${participant.role}`);
      console.log(`  Exchange: ${participant.exchange_id.substring(0, 8)}...`);

      // Find user by email
      const { data: user } = await supabaseService.client
        .from('users')
        .select('id, email, contact_id')
        .eq('email', contact.email)
        .single();

      if (user) {
        console.log(`  ✅ Found user: ${user.email} (ID: ${user.id})`);
        
        // Update participant with correct user_id and user's contact_id
        const updateData = {
          user_id: user.id,
          updated_at: new Date().toISOString()
        };
        
        // If user has a contact_id, update participant to use it
        if (user.contact_id && user.contact_id !== participant.contact_id) {
          console.log(`  📝 Updating contact_id: ${participant.contact_id} → ${user.contact_id}`);
          updateData.contact_id = user.contact_id;
        }

        const { error: updateError } = await supabaseService.client
          .from('exchange_participants')
          .update(updateData)
          .eq('id', participant.id);

        if (updateError) {
          console.log(`  ❌ Failed to update: ${updateError.message}`);
          failed++;
        } else {
          console.log(`  ✅ Successfully updated participant record`);
          fixed++;
        }
      } else {
        console.log(`  ⚠️ No user account found for email: ${contact.email}`);
        notFound++;
      }
    }

    // Step 3: Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 FIX SUMMARY\n');
    console.log(`  ✅ Fixed: ${fixed} records`);
    console.log(`  ⚠️ No user found: ${notFound} records`);
    console.log(`  ❌ Failed: ${failed} records`);
    console.log(`  📋 Total processed: ${orphaned.length} records`);

    // Step 4: Verify the fix
    if (fixed > 0) {
      console.log('\n📋 Step 3: Verifying the fix...\n');
      
      // Check coordinator access
      const { data: coordUser } = await supabaseService.client
        .from('users')
        .select('id, email')
        .eq('email', 'coordinator@peak1031.com')
        .single();

      if (coordUser) {
        const { data: coordParticipants } = await supabaseService.client
          .from('exchange_participants')
          .select('exchange_id')
          .eq('user_id', coordUser.id);

        console.log(`Coordinator (${coordUser.email}):`);
        console.log(`  ✅ Can now access ${coordParticipants?.length || 0} exchanges`);
      }

      // Check third_party access
      const { data: tpUser } = await supabaseService.client
        .from('users')
        .select('id, email')
        .eq('email', 'thirdparty1@peak1031.com')
        .single();

      if (tpUser) {
        const { data: tpParticipants } = await supabaseService.client
          .from('exchange_participants')
          .select('exchange_id')
          .eq('user_id', tpUser.id);

        console.log(`\nThird Party (${tpUser.email}):`);
        console.log(`  ✅ Can now access ${tpParticipants?.length || 0} exchanges`);
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ MISMATCH FIX COMPLETE!');
    console.log('\nThe system should now work correctly for all invited users.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

// Run the fix
fixContactIdMismatch();