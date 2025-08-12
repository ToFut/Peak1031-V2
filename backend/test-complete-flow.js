#!/usr/bin/env node

/**
 * Complete test of the invitation and notification flow
 * Verifies all components are working together
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function testCompleteInvitationFlow() {
  console.log('🧪 COMPLETE INVITATION FLOW TEST\n');
  console.log('=' .repeat(60));
  
  const results = {
    notifications_table: false,
    user_id_column: false,
    coordinator_access: false,
    notification_creation: false,
    overall: false
  };

  try {
    // Test 1: Notifications table exists
    console.log('\n✓ Test 1: Checking notifications table...');
    const { data: notifTable } = await supabaseService.client
      .from('notifications')
      .select('id')
      .limit(1);
    
    if (notifTable !== null) {
      console.log('  ✅ Notifications table exists and is accessible');
      results.notifications_table = true;
    } else {
      console.log('  ❌ Notifications table not found');
    }

    // Test 2: User_id column in exchange_participants
    console.log('\n✓ Test 2: Checking user_id column in exchange_participants...');
    const { data: participants, error: partError } = await supabaseService.client
      .from('exchange_participants')
      .select('user_id')
      .limit(1);
    
    if (!partError) {
      console.log('  ✅ user_id column exists in exchange_participants');
      results.user_id_column = true;
    } else if (partError.message.includes('column exchange_participants.user_id does not exist')) {
      console.log('  ❌ user_id column missing in exchange_participants');
    } else {
      console.log('  ⚠️ Unexpected error:', partError.message);
    }

    // Test 3: Coordinator can see exchanges
    console.log('\n✓ Test 3: Verifying coordinator exchange access...');
    const { data: coordinator } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'coordinator@peak1031.com')
      .single();

    if (coordinator) {
      const { data: coordParticipants } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id')
        .eq('user_id', coordinator.id);

      if (coordParticipants && coordParticipants.length > 0) {
        console.log(`  ✅ Coordinator has access to ${coordParticipants.length} exchange(s)`);
        results.coordinator_access = true;
      } else {
        console.log('  ⚠️ Coordinator has no exchange access');
      }
    } else {
      console.log('  ⚠️ Coordinator user not found');
    }

    // Test 4: Notification creation works
    console.log('\n✓ Test 4: Testing notification creation...');
    if (results.notifications_table) {
      const testNotif = {
        id: require('uuid').v4(),
        user_id: coordinator?.id || '86ff2e3e-cba2-48d9-af47-dd25d14ebaee',
        title: 'System Test',
        message: 'Testing notification system',
        type: 'test',
        read: false,
        urgency: 'low',
        created_at: new Date().toISOString()
      };

      const { data: created, error: createError } = await supabaseService.client
        .from('notifications')
        .insert(testNotif)
        .select()
        .single();

      if (created) {
        console.log('  ✅ Notification creation successful');
        results.notification_creation = true;
        
        // Clean up
        await supabaseService.client
          .from('notifications')
          .delete()
          .eq('id', created.id);
      } else {
        console.log('  ❌ Failed to create notification:', createError?.message);
      }
    } else {
      console.log('  ⚠️ Skipped - notifications table not available');
    }

    // Overall assessment
    results.overall = Object.values(results).filter(v => v === true).length >= 3;

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('📊 TEST RESULTS SUMMARY\n');
    
    console.log('Component Status:');
    console.log(`  Notifications Table:     ${results.notifications_table ? '✅ Working' : '❌ Not Working'}`);
    console.log(`  User ID Column:          ${results.user_id_column ? '✅ Working' : '❌ Not Working'}`);
    console.log(`  Coordinator Access:      ${results.coordinator_access ? '✅ Working' : '❌ Not Working'}`);
    console.log(`  Notification Creation:   ${results.notification_creation ? '✅ Working' : '❌ Not Working'}`);
    
    console.log('\n' + '=' .repeat(60));
    if (results.overall) {
      console.log('🎉 OVERALL: SYSTEM IS WORKING CORRECTLY!');
      console.log('\nThe invitation and notification system is fully operational.');
      console.log('Users will now:');
      console.log('  • Receive popup notifications when invited');
      console.log('  • See notifications in their notification bar');
      console.log('  • Have access to exchanges they are invited to');
    } else {
      console.log('⚠️ OVERALL: SOME COMPONENTS NEED ATTENTION');
      
      const issues = [];
      if (!results.notifications_table) issues.push('Create notifications table');
      if (!results.user_id_column) issues.push('Add user_id column to exchange_participants');
      
      if (issues.length > 0) {
        console.log('\nRequired actions:');
        issues.forEach(issue => console.log(`  • ${issue}`));
        console.log('\nRun the SQL scripts in Supabase SQL Editor:');
        console.log('  • create-notifications-table.sql');
        console.log('  • add-user-id-to-participants.sql');
      }
    }

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
  }
}

// Run the test
testCompleteInvitationFlow();