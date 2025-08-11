require('dotenv').config();
const databaseService = require('./services/database');

async function createTestMessagesWithAttachments() {
  console.log('💬 Creating test messages with document attachments...\n');

  try {
    // Known document IDs from the previous script
    const pinDocumentId = '54fe6033-237f-47ea-b5c3-55bd93dd0bbb'; // PIN: 1234
    const noPinDocumentId = '041056f0-940b-41fe-bde3-1f75078969c8'; // No PIN

    // Create message with PIN-protected document
    const messageWithPin = {
      content: '🔒 Here\'s a document with PIN protection (PIN: 1234)',
      exchange_id: 'df7ea956-a936-45c6-b683-143e9dda5230',
      sender_id: '278304de-568f-4138-b35b-6fdcfbd2f1ce', // Admin user
      message_type: 'text',
      attachments: [pinDocumentId],
      created_at: new Date().toISOString(),
      read_by: []
    };

    console.log('📎 Creating message with PIN-protected attachment...');
    const createdMessageWithPin = await databaseService.createMessage(messageWithPin);
    console.log('✅ Message with PIN attachment created:', createdMessageWithPin.id);

    // Create message with no-PIN document
    const messageWithoutPin = {
      content: '📄 Here\'s a document without PIN protection (free access)',
      exchange_id: 'df7ea956-a936-45c6-b683-143e9dda5230',
      sender_id: '278304de-568f-4138-b35b-6fdcfbd2f1ce',
      message_type: 'text',
      attachments: [noPinDocumentId],
      created_at: new Date().toISOString(),
      read_by: []
    };

    console.log('📎 Creating message with no-PIN attachment...');
    const createdMessageWithoutPin = await databaseService.createMessage(messageWithoutPin);
    console.log('✅ Message without PIN attachment created:', createdMessageWithoutPin.id);

    console.log('\n🧪 Test Information:');
    console.log('=' .repeat(60));
    console.log('MESSAGE WITH PIN-PROTECTED DOCUMENT:');
    console.log(`  Message ID: ${createdMessageWithPin.id}`);
    console.log(`  Document ID: ${pinDocumentId}`);
    console.log(`  Document PIN: 1234`);
    console.log(`  Content: "${messageWithPin.content}"`);
    
    console.log('\nMESSAGE WITH NO-PIN DOCUMENT:');
    console.log(`  Message ID: ${createdMessageWithoutPin.id}`);
    console.log(`  Document ID: ${noPinDocumentId}`);
    console.log(`  Content: "${messageWithoutPin.content}"`);
    
    console.log('\n🔗 Test URLs:');
    console.log(`  Messages API: GET /api/messages/exchange/df7ea956-a936-45c6-b683-143e9dda5230`);
    console.log(`  PIN Doc API: GET /api/documents/${pinDocumentId}/download?pin=1234`);
    console.log(`  No-PIN Doc API: GET /api/documents/${noPinDocumentId}/download`);
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Failed to create test messages:', error);
  }
}

createTestMessagesWithAttachments().then(() => {
  console.log('\n🏁 Test message creation completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});