#!/usr/bin/env node

/**
 * Fix missing user_id in exchange_participants table
 * Maps contact_id to user_id for existing records
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function fixParticipantUserIds() {
  console.log('🔧 Fixing missing user_id in exchange_participants\n');
  
  try {
    // Step 1: Find participants with contact_id but no user_id
    const { data: participants } = await supabaseService.client
      .from('exchange_participants')
      .select('*')
      .not('contact_id', 'is', null)
      .is('user_id', null);

    if (!participants || participants.length === 0) {
      console.log('✅ No participants with missing user_id found');
      return;
    }

    console.log(`Found ${participants.length} participants with missing user_id\n`);

    // Step 2: Get unique contact_ids
    const contactIds = [...new Set(participants.map(p => p.contact_id))];
    console.log(`Checking ${contactIds.length} unique contact IDs...\n`);

    // Step 3: Find users with these contact_ids
    const { data: users } = await supabaseService.client
      .from('users')
      .select('id, email, contact_id')
      .in('contact_id', contactIds);

    if (!users || users.length === 0) {
      console.log('⚠️ No users found with matching contact_ids');
      return;
    }

    // Create a map of contact_id to user_id
    const contactToUser = {};
    users.forEach(user => {
      contactToUser[user.contact_id] = user.id;
      console.log(`  Mapped contact ${user.contact_id} → user ${user.email}`);
    });

    console.log(`\n📝 Updating ${participants.length} participant records...`);

    // Step 4: Update each participant record
    let updated = 0;
    let failed = 0;

    for (const participant of participants) {
      const userId = contactToUser[participant.contact_id];
      
      if (userId) {
        const { error } = await supabaseService.client
          .from('exchange_participants')
          .update({ 
            user_id: userId,
            updated_at: new Date().toISOString()
          })
          .eq('id', participant.id);

        if (error) {
          console.log(`  ❌ Failed to update participant ${participant.id}: ${error.message}`);
          failed++;
        } else {
          console.log(`  ✅ Updated participant ${participant.id} with user_id ${userId}`);
          updated++;
        }
      } else {
        console.log(`  ⚠️ No user found for contact ${participant.contact_id}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY:');
    console.log(`  ✅ Successfully updated: ${updated} records`);
    console.log(`  ❌ Failed to update: ${failed} records`);
    console.log(`  ⚠️ No user mapping: ${participants.length - updated - failed} records`);

    // Verify the fix for coordinator
    console.log('\n🔍 Verifying coordinator access...');
    const { data: coordinator } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'coordinator@peak1031.com')
      .single();

    if (coordinator) {
      const { data: updatedParticipants } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id')
        .eq('user_id', coordinator.id);

      if (updatedParticipants && updatedParticipants.length > 0) {
        console.log(`✅ Coordinator now has access to ${updatedParticipants.length} exchange(s)`);
      } else {
        console.log('⚠️ Coordinator still has no exchange access');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixParticipantUserIds();