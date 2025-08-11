require('dotenv').config();
const jwt = require('jsonwebtoken');

async function testMessageSending() {
  try {
    console.log('🧪 Testing Message Sending...\n');
    
    // Create a test JWT token
    const payload = {
      userId: '278304de-568f-4138-b35b-6fdcfbd2f1ce',
      email: 'admin@peak1031.com',
      role: 'admin',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
    };
    
    const token = jwt.sign(payload, process.env.JWT_SECRET || 'your-secret-key');
    
    // Test sending a message
    const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
    const testMessage = {
      exchangeId,
      content: `Test message from API at ${new Date().toLocaleTimeString()}`,
      messageType: 'text'
    };
    
    console.log('📤 Sending test message to exchange:', exchangeId);
    
    const response = await fetch('http://localhost:5001/api/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    });
    
    console.log('📥 Response status:', response.status, response.statusText);
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Message sent successfully!');
      console.log('Message ID:', data.data?.id);
      console.log('Content:', data.data?.content);
      
      // Test marking as read
      if (data.data?.id) {
        console.log('\n🔖 Testing mark as read...');
        const readResponse = await fetch(`http://localhost:5001/api/messages/${data.data.id}/read`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('📥 Mark as read response:', readResponse.status, readResponse.statusText);
        
        if (readResponse.ok) {
          console.log('✅ Message marked as read successfully!');
        } else {
          const errorData = await readResponse.json();
          console.log('❌ Error marking as read:', errorData);
        }
      }
    } else {
      console.log('❌ Error sending message:', data);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testMessageSending().then(() => {
  console.log('\n✅ Test complete');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});