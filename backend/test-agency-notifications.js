/**
 * Test Agency Notifications
 * Logs in as agency user and fetches notifications to test if invitations are shown
 */

const axios = require('axios');

async function testAgencyNotifications() {
  try {
    console.log('🔐 Logging in as agency user...');
    
    // Step 1: Login as agency user
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'agency@peak1031.com',
      password: 'password123'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token');
    
    // Step 2: Fetch notifications
    console.log('📬 Fetching notifications...');
    const notificationsResponse = await axios.get('http://localhost:5001/api/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('✅ Notifications fetched successfully:');
    console.log(JSON.stringify(notificationsResponse.data, null, 2));
    
    // Step 3: Check if we have invitation notifications
    const invitationNotifications = notificationsResponse.data.notifications.filter(n => n.type === 'invitation');
    
    if (invitationNotifications.length > 0) {
      console.log(`🎉 SUCCESS: Found ${invitationNotifications.length} invitation notifications for agency user!`);
      invitationNotifications.forEach(inv => {
        console.log(`   - ${inv.title}: ${inv.message}`);
      });
    } else {
      console.log('❌ ISSUE: No invitation notifications found for agency user');
    }
    
  } catch (error) {
    console.error('❌ Error testing agency notifications:', error.response?.data || error.message);
  }
}

testAgencyNotifications().then(() => {
  console.log('🏁 Test completed');
  process.exit(0);
});