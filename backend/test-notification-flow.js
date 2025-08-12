#!/usr/bin/env node

/**
 * Test script to verify end-to-end notification flow
 * Run with: node test-notification-flow.js
 */

const supabaseService = require('./services/supabase');
const { v4: uuidv4 } = require('uuid');

async function testNotificationFlow() {
  console.log('🧪 Testing end-to-end notification flow...\n');

  try {
    // Step 1: Find a test user
    console.log('1. Finding test user...');
    const users = await supabaseService.getUsers({ limit: 1 });
    if (!users || users.length === 0) {
      throw new Error('No users found in database');
    }
    
    const testUser = users[0];
    console.log(`✅ Found test user: ${testUser.email} (ID: ${testUser.id})\n`);

    // Step 2: Create a test notification
    console.log('2. Creating test notification...');
    const notificationData = {
      id: uuidv4(),
      user_id: testUser.id,
      title: 'Test Notification',
      message: `Test notification created at ${new Date().toLocaleTimeString()}`,
      type: 'test',
      read: false,
      related_exchange_id: null,
      urgency: 'high',
      created_at: new Date().toISOString()
    };

    const result = await supabaseService.createNotification(notificationData);
    console.log('✅ Created notification:', result);
    console.log();

    // Step 3: Retrieve notifications for the user
    console.log('3. Retrieving notifications for user...');
    const { data: notifications, error } = await supabaseService.client
      .from('notifications')
      .select('*')
      .eq('user_id', testUser.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      throw new Error(`Failed to retrieve notifications: ${error.message}`);
    }

    console.log(`✅ Found ${notifications.length} notifications for user:`);
    notifications.forEach((n, i) => {
      console.log(`   ${i + 1}. ${n.title} - ${n.message} (${n.read ? 'read' : 'unread'})`);
    });
    console.log();

    // Step 4: Test marking as read
    console.log('4. Testing mark as read...');
    const testNotification = notifications.find(n => n.id === result.id);
    if (testNotification) {
      const { data: updatedNotification, error: updateError } = await supabaseService.client
        .from('notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', testNotification.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update notification: ${updateError.message}`);
      }

      console.log('✅ Successfully marked notification as read');
      console.log();
    }

    console.log('🎉 All tests passed! Notification flow is working correctly.\n');

    // Cleanup
    console.log('5. Cleaning up test notification...');
    const { error: deleteError } = await supabaseService.client
      .from('notifications')
      .delete()
      .eq('id', result.id);

    if (deleteError) {
      console.warn('⚠️ Failed to cleanup test notification:', deleteError.message);
    } else {
      console.log('✅ Cleaned up test notification');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testNotificationFlow();
}

module.exports = { testNotificationFlow };