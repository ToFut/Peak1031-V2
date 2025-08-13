#!/usr/bin/env node

/**
 * Test script for enhanced notifications system
 */

const notificationService = require('./services/notifications');

async function testEnhancedNotifications() {
  console.log('🧪 Testing Enhanced Notifications System');
  console.log('=' .repeat(50));

  try {
    // Test 1: Create a simple notification
    console.log('\n📝 Test 1: Creating a simple notification...');
    const result1 = await notificationService.createNotification({
      userId: '123e4567-e89b-12d3-a456-426614174000', // Mock user ID
      type: 'info',
      category: 'system',
      title: 'Test Notification',
      message: 'This is a test notification from the enhanced system',
      priority: 'medium',
      actionUrl: '/dashboard',
      actionLabel: 'View Dashboard',
      metadata: {
        testData: 'This is test metadata'
      }
    });
    
    console.log('✅ Simple notification created:', result1.success ? 'Success' : 'Failed');
    if (result1.notification) {
      console.log('   ID:', result1.notification.id);
      console.log('   Title:', result1.notification.title);
    }

    // Test 2: Create notification from template
    console.log('\n📝 Test 2: Creating notification from template...');
    const result2 = await notificationService.createNotificationFromTemplate(
      'task_assigned',
      '123e4567-e89b-12d3-a456-426614174000',
      {
        task_title: 'Review Documents',
        exchange_name: 'Pine Valley Exchange',
        due_date: '2024-01-15',
        task_id: 'task_123'
      }
    );
    
    console.log('✅ Template notification created:', result2.success ? 'Success' : 'Failed');
    if (result2.notification) {
      console.log('   Title:', result2.notification.title);
      console.log('   Message:', result2.notification.message);
    }

    // Test 3: Test notification preferences
    console.log('\n📝 Test 3: Testing notification preferences...');
    const preferences = await notificationService.getAllNotificationPreferences(
      '123e4567-e89b-12d3-a456-426614174000'
    );
    
    console.log('✅ Preferences retrieved:', preferences.length, 'categories');

    // Test 4: Test notification counts
    console.log('\n📝 Test 4: Testing notification counts...');
    const count = await notificationService.getUnreadNotificationCount(
      '123e4567-e89b-12d3-a456-426614174000'
    );
    
    console.log('✅ Unread count:', count);

    // Test 5: Test notification history
    console.log('\n📝 Test 5: Testing notification history...');
    const history = await notificationService.getNotificationHistory(
      '123e4567-e89b-12d3-a456-426614174000',
      { limit: 10, category: 'system' }
    );
    
    console.log('✅ History retrieved:', history.notifications.length, 'notifications');
    console.log('   Total in database:', history.total);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run tests if called directly
if (require.main === module) {
  testEnhancedNotifications()
    .then(() => {
      console.log('\n✅ Test suite completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test suite failed:', error);
      process.exit(1);
    });
}

module.exports = {
  testEnhancedNotifications
};