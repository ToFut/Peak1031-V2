#!/usr/bin/env node
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testMessageStructure() {
  console.log('🔍 Testing message data structure...\n');

  try {
    // 1. Find a message with attachments
    console.log('📥 Looking for messages with attachments...');
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .not('attachments', 'is', null)
      .limit(5);

    if (msgError) {
      console.error('❌ Error fetching messages:', msgError);
      return;
    }

    console.log(`\n✅ Found ${messages.length} messages with attachments\n`);

    // 2. Display message structure
    messages.forEach((msg, index) => {
      console.log(`Message ${index + 1}:`);
      console.log('  ID:', msg.id);
      console.log('  Content:', msg.content?.substring(0, 50) + '...');
      console.log('  Attachments field:', msg.attachments);
      console.log('  Attachments type:', Array.isArray(msg.attachments) ? 'array' : typeof msg.attachments);
      
      if (msg.attachments && msg.attachments.length > 0) {
        console.log('  First attachment ID:', msg.attachments[0]);
      }
      console.log('');
    });

    // 3. Test fetching a document by ID
    if (messages.length > 0 && messages[0].attachments && messages[0].attachments.length > 0) {
      const docId = messages[0].attachments[0];
      console.log(`\n📄 Fetching document with ID: ${docId}`);
      
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', docId)
        .single();

      if (docError) {
        console.error('❌ Error fetching document:', docError);
      } else {
        console.log('\n✅ Document details:');
        console.log('  ID:', doc.id);
        console.log('  Filename:', doc.original_filename);
        console.log('  Size:', doc.file_size);
        console.log('  Type:', doc.mime_type);
        console.log('  PIN Required:', doc.pin_required);
        console.log('  Category:', doc.category);
      }
    }

    // 4. Test the join query
    console.log('\n\n🔗 Testing message with sender join...');
    const { data: joinedMsg, error: joinError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:sender_id(id, email, first_name, last_name, role)
      `)
      .not('attachments', 'is', null)
      .limit(1)
      .single();

    if (joinError) {
      console.error('❌ Join query error:', joinError);
    } else {
      console.log('✅ Message with sender:', JSON.stringify(joinedMsg, null, 2));
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMessageStructure().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test error:', err);
  process.exit(1);
});