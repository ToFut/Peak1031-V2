require('dotenv').config();
const databaseService = require('./services/database');

async function finalAttachmentTest() {
  console.log('🎯 FINAL ATTACHMENT FLOW TEST\n');

  try {
    console.log('1️⃣ Fetching messages with attachments...');
    
    const messages = await databaseService.getMessages({
      where: { exchangeId: 'df7ea956-a936-45c6-b683-143e9dda5230' },
      limit: 5,
      orderBy: { column: 'created_at', ascending: false }
    });

    console.log(`✅ Found ${messages.length} messages\n`);

    // Filter messages with attachments
    const messagesWithAttachments = messages.filter(msg => 
      msg.attachments && msg.attachments.length > 0
    );

    console.log(`2️⃣ Messages with attachments: ${messagesWithAttachments.length}\n`);

    messagesWithAttachments.forEach((msg, index) => {
      console.log(`📨 Message ${index + 1}:`);
      console.log(`   ID: ${msg.id}`);
      console.log(`   Content: ${msg.content}`);
      console.log(`   Attachments: ${JSON.stringify(msg.attachments)}`);
      
      if (msg.attachment) {
        console.log(`   ✅ Attachment enriched:`);
        console.log(`     📄 File: ${msg.attachment.original_filename}`);
        console.log(`     📏 Size: ${msg.attachment.file_size} bytes`);
        console.log(`     🔒 PIN Required: ${msg.attachment.pin_required}`);
        console.log(`     📂 Category: ${msg.attachment.category}`);
        console.log(`     🔑 Attachment ID: ${msg.attachment_id}`);
      } else {
        console.log(`   ❌ No attachment data (enrichment failed)`);
      }
      console.log('');
    });

    console.log('3️⃣ Summary of test results:');
    console.log('=' .repeat(60));

    const testDocuments = [
      {
        id: '54fe6033-237f-47ea-b5c3-55bd93dd0bbb',
        pin: '1234',
        description: 'PIN-protected document'
      },
      {
        id: '041056f0-940b-41fe-bde3-1f75078969c8',
        pin: null,
        description: 'No-PIN document'
      }
    ];

    testDocuments.forEach(doc => {
      const message = messagesWithAttachments.find(msg => 
        msg.attachments && msg.attachments.includes(doc.id)
      );

      if (message) {
        console.log(`✅ ${doc.description}:`);
        console.log(`   Document ID: ${doc.id}`);
        if (doc.pin) {
          console.log(`   PIN: ${doc.pin}`);
          console.log(`   Test URL: GET /api/documents/${doc.id}/download?pin=${doc.pin}`);
        } else {
          console.log(`   PIN: Not required`);
          console.log(`   Test URL: GET /api/documents/${doc.id}/download`);
        }
        console.log(`   Message ID: ${message.id}`);
        console.log(`   Attachment enriched: ${message.attachment ? 'Yes' : 'No'}`);
      } else {
        console.log(`❌ ${doc.description}: Message not found`);
      }
      console.log('');
    });

    console.log('4️⃣ Frontend Testing Instructions:');
    console.log('=' .repeat(60));
    console.log('1. Open the Messages tab or Exchange Detail page');
    console.log('2. Look for the test messages created above');
    console.log('3. Click on the file attachments');
    console.log('4. For PIN-protected files, enter PIN: 1234');
    console.log('5. For no-PIN files, download should work immediately');
    console.log('');
    console.log('Expected behavior:');
    console.log('- ChatDocumentViewer displays with View/Download buttons');
    console.log('- PIN modal appears for protected files');
    console.log('- PIN "1234" should work');
    console.log('- Wrong PINs should show error');
    console.log('- No-PIN files download without modal');
    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Final test failed:', error);
  }
}

finalAttachmentTest().then(() => {
  console.log('\n🏁 FINAL ATTACHMENT TEST COMPLETED');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});