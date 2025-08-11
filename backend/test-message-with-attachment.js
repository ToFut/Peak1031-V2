require('dotenv').config();

const databaseService = require('./services/database');

async function testMessageWithAttachment() {
  console.log('🔍 Testing getMessages with attachment enrichment...\n');

  try {
    // Get recent messages from all exchanges to find ones with attachments
    const recentMessages = await databaseService.getMessages({
      limit: 10,
      orderBy: { column: 'created_at', ascending: false }
    });

    console.log(`Found ${recentMessages.length} messages\n`);

    recentMessages.forEach((msg, index) => {
      console.log(`\n--- Message ${index + 1} ---`);
      console.log(`ID: ${msg.id}`);
      console.log(`Content: ${msg.content?.substring(0, 50)}...`);
      console.log(`Attachments array: ${JSON.stringify(msg.attachments)}`);
      
      if (msg.attachment) {
        console.log(`✅ Attachment data found:`);
        console.log(`  - ID: ${msg.attachment.id}`);
        console.log(`  - Filename: ${msg.attachment.original_filename}`);
        console.log(`  - Size: ${msg.attachment.file_size}`);
        console.log(`  - MIME: ${msg.attachment.mime_type}`);
        console.log(`  - PIN Required: ${msg.attachment.pin_required}`);
      } else {
        console.log('❌ No attachment data found');
      }

      if (msg.attachment_id) {
        console.log(`Attachment ID set: ${msg.attachment_id}`);
      }

      if (msg.sender) {
        console.log(`Sender: ${msg.sender.first_name} ${msg.sender.last_name} (${msg.sender.email})`);
      }
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testMessageWithAttachment().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test error:', err);
  process.exit(1);
});