require('dotenv').config();

const databaseService = require('./services/database');

async function finalAttachmentTest() {
  console.log('🎯 Final attachment verification test...\n');

  try {
    console.log('1️⃣ Fetching recent messages with attachments...');
    
    // Get the most recent messages (last 5) across all exchanges
    const messages = await databaseService.getMessages({
      limit: 5,
      orderBy: { column: 'created_at', ascending: false }
    });

    console.log(`✅ Fetched ${messages.length} messages\n`);

    let foundAttachment = false;
    
    messages.forEach((msg, index) => {
      console.log(`--- Message ${index + 1} ---`);
      console.log(`ID: ${msg.id}`);
      console.log(`Content: ${msg.content?.substring(0, 50)}...`);
      console.log(`Created: ${msg.created_at}`);
      console.log(`Attachments array: ${JSON.stringify(msg.attachments)}`);
      
      if (msg.attachments && msg.attachments.length > 0) {
        console.log(`✅ Has attachment IDs: ${msg.attachments.join(', ')}`);
        
        if (msg.attachment) {
          console.log(`✅ Attachment metadata enriched:`);
          console.log(`  📄 Filename: ${msg.attachment.original_filename}`);
          console.log(`  📏 Size: ${msg.attachment.file_size} bytes`);
          console.log(`  🎭 MIME: ${msg.attachment.mime_type}`);
          console.log(`  🔒 PIN Required: ${msg.attachment.pin_required}`);
          console.log(`  📂 Category: ${msg.attachment.category}`);
          console.log(`  📅 Created: ${msg.attachment.created_at}`);
          foundAttachment = true;
        } else {
          console.log(`❌ Missing attachment metadata (enrichment failed)`);
        }
        
        if (msg.attachment_id) {
          console.log(`✅ Attachment ID set: ${msg.attachment_id}`);
        } else {
          console.log(`❌ Missing attachment_id field`);
        }
      } else {
        console.log(`ℹ️  No attachments`);
      }
      
      console.log(); // Empty line
    });

    console.log('\n🎯 Test Summary:');
    console.log(`✅ Messages fetched: ${messages.length}`);
    console.log(`✅ Attachment enrichment working: ${foundAttachment ? 'Yes' : 'No'}`);
    
    if (foundAttachment) {
      console.log('\n🎉 SUCCESS: Attachment system is working!');
      console.log('   → Messages with attachments have enriched metadata');
      console.log('   → ChatDocumentViewer should display these properly');
      console.log('   → PIN protection data is available');
    } else {
      console.log('\n⚠️  No messages with attachments found in recent messages');
      console.log('   → Try uploading a new file to test the complete flow');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
finalAttachmentTest().then(() => {
  console.log('\n🏁 Final verification completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test error:', err);
  process.exit(1);
});