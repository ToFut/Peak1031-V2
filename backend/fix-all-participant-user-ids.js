#!/usr/bin/env node

/**
 * Fix all participant records that are missing user_id
 * Maps contact_id to user_id for ALL orphaned records
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function fixAllParticipantUserIds() {
  console.log('🔧 Fixing ALL participant records missing user_id\n');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Find ALL participants without user_id
    console.log('📋 Step 1: Finding participants without user_id...');
    const { data: orphaned, error: orphanError } = await supabaseService.client
      .from('exchange_participants')
      .select('*')
      .is('user_id', null)
      .not('contact_id', 'is', null);

    if (orphanError) {
      console.error('❌ Error finding orphaned records:', orphanError.message);
      return;
    }

    if (!orphaned || orphaned.length === 0) {
      console.log('✅ No orphaned participant records found!');
      return;
    }

    console.log(`Found ${orphaned.length} participant records with missing user_id\n`);

    // Group by role
    const byRole = {};
    orphaned.forEach(p => {
      if (!byRole[p.role]) byRole[p.role] = [];
      byRole[p.role].push(p);
    });

    console.log('Breakdown by role:');
    Object.entries(byRole).forEach(([role, participants]) => {
      console.log(`  ${role}: ${participants.length} records`);
    });

    // Step 2: Get all unique contact_ids
    const contactIds = [...new Set(orphaned.map(p => p.contact_id).filter(Boolean))];
    console.log(`\n📋 Step 2: Looking up users for ${contactIds.length} unique contact IDs...`);

    // Step 3: Find users with these contact_ids
    const { data: users } = await supabaseService.client
      .from('users')
      .select('id, email, contact_id, role')
      .in('contact_id', contactIds);

    if (!users || users.length === 0) {
      console.log('⚠️ No users found with matching contact_ids');
      console.log('\nThese participants may be for users who haven\'t registered yet.');
      return;
    }

    console.log(`Found ${users.length} users with matching contact_ids\n`);

    // Create a map of contact_id to user
    const contactToUser = {};
    users.forEach(user => {
      contactToUser[user.contact_id] = user;
    });

    // Step 4: Update each orphaned participant record
    console.log('📋 Step 3: Updating participant records...\n');
    
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const participant of orphaned) {
      const user = contactToUser[participant.contact_id];
      
      if (user) {
        const { error: updateError } = await supabaseService.client
          .from('exchange_participants')
          .update({ 
            user_id: user.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', participant.id);

        if (updateError) {
          console.log(`  ❌ Failed to update participant ${participant.id}: ${updateError.message}`);
          failed++;
        } else {
          console.log(`  ✅ Updated ${participant.role} participant (${user.email})`);
          updated++;
        }
      } else {
        console.log(`  ⚠️ Skipped - no user for contact ${participant.contact_id} (${participant.role})`);
        skipped++;
      }
    }

    // Step 5: Verify the fix
    console.log('\n' + '=' .repeat(60));
    console.log('📊 UPDATE SUMMARY\n');
    console.log(`  ✅ Successfully updated: ${updated} records`);
    console.log(`  ⚠️ Skipped (no user yet): ${skipped} records`);
    console.log(`  ❌ Failed to update: ${failed} records`);
    console.log(`  📋 Total processed: ${orphaned.length} records`);

    // Step 6: Check if any orphaned records remain
    console.log('\n📋 Step 4: Verifying remaining orphaned records...');
    const { data: stillOrphaned } = await supabaseService.client
      .from('exchange_participants')
      .select('id')
      .is('user_id', null)
      .not('contact_id', 'is', null);

    if (stillOrphaned && stillOrphaned.length > 0) {
      console.log(`\n⚠️ ${stillOrphaned.length} records still missing user_id`);
      console.log('These are likely for users who haven\'t accepted invitations yet.');
    } else {
      console.log('\n✅ All possible participant records have been fixed!');
    }

    // Step 7: Test specific roles
    console.log('\n📋 Step 5: Testing role access...\n');
    
    const testRoles = ['agency', 'coordinator', 'third_party'];
    for (const role of testRoles) {
      const { data: roleUsers } = await supabaseService.client
        .from('users')
        .select('id, email')
        .eq('role', role)
        .limit(1);

      if (roleUsers && roleUsers.length > 0) {
        const user = roleUsers[0];
        const { data: userParticipants } = await supabaseService.client
          .from('exchange_participants')
          .select('exchange_id')
          .eq('user_id', user.id);

        console.log(`${role.toUpperCase()}: ${user.email}`);
        console.log(`  Can access ${userParticipants?.length || 0} exchanges`);
      }
    }

    console.log('\n' + '=' .repeat(60));
    console.log('✅ FIX COMPLETE!');
    console.log('\nNext steps:');
    console.log('1. Test the application with agency, coordinator, and third_party users');
    console.log('2. They should now see their assigned exchanges');
    console.log('3. Check chat, tasks, and documents access');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

// Run the fix
fixAllParticipantUserIds();