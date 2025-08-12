/**
 * Test script to verify messages now include sender names
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const testMessageWithSender = async () => {
  try {
    console.log('🧪 Testing messages with sender names...');
    
    // Create admin JWT token
    const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
    const adminToken = jwt.sign(
      {
        userId: adminUserId,
        id: adminUserId,
        email: 'admin@peak1031.com',
        role: 'admin',
        contact_id: adminUserId
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('🎫 Created admin JWT token');
    
    const fetch = require('node-fetch');
    const baseURL = 'http://localhost:5001/api';
    const targetExchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
    
    // Test getting messages through the API endpoint
    console.log('\n📋 Fetching messages for exchange:', targetExchangeId);
    
    const response = await fetch(`${baseURL}/messages/exchange/${targetExchangeId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.log('❌ Failed to get messages:', response.status);
      const errorText = await response.text();
      console.log('Error:', errorText);
      return;
    }
    
    const data = await response.json();
    const messages = data.data || [];
    
    console.log(`📊 Got ${messages.length} messages`);
    
    if (messages.length > 0) {
      console.log('\n📧 Checking sender information in messages:');
      
      messages.slice(0, 5).forEach((msg, idx) => {
        console.log(`\nMessage ${idx + 1}:`);
        console.log('  - Content:', msg.content ? msg.content.substring(0, 50) + '...' : 'No content');
        console.log('  - Sender ID:', msg.sender_id);
        
        if (msg.sender) {
          console.log('  ✅ Sender data exists:');
          console.log('     - First Name:', msg.sender.first_name || 'None');
          console.log('     - Last Name:', msg.sender.last_name || 'None');
          console.log('     - Email:', msg.sender.email || 'None');
          console.log('     - Role:', msg.sender.role || 'None');
          
          const displayName = msg.sender.first_name && msg.sender.last_name ?
            `${msg.sender.first_name} ${msg.sender.last_name}` :
            'Unknown User';
          console.log('     - Display Name:', displayName);
        } else {
          console.log('  ❌ No sender data - will show as "Unknown User"');
        }
      });
      
      // Count how many messages have sender information
      const messagesWithSender = messages.filter(m => m.sender).length;
      const messagesWithoutSender = messages.filter(m => !m.sender).length;
      
      console.log('\n📊 Summary:');
      console.log(`  - Messages with sender info: ${messagesWithSender}`);
      console.log(`  - Messages without sender info: ${messagesWithoutSender}`);
      
      if (messagesWithoutSender > 0) {
        const missingSenderIds = [...new Set(
          messages
            .filter(m => !m.sender && m.sender_id)
            .map(m => m.sender_id)
        )];
        console.log(`  - Missing sender IDs: ${missingSenderIds.join(', ')}`);
      }
    } else {
      console.log('❌ No messages found for this exchange');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testMessageWithSender();