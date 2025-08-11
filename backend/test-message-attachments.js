#!/usr/bin/env node
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testMessageAttachments() {
  console.log('🔍 Testing message attachments with PIN support...\n');

  try {
    // 1. Test fetching messages with attachments
    console.log('📥 Fetching messages with attachments...');
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, email, first_name, last_name, role),
        attachment:documents!messages_attachment_id_fkey(
          id,
          original_filename,
          file_size,
          mime_type,
          pin_required,
          category,
          description,
          created_at
        )
      `)
      .not('attachment_id', 'is', null)
      .limit(5)
      .order('created_at', { ascending: false });

    if (msgError) {
      console.error('❌ Error fetching messages:', msgError);
      return;
    }

    console.log(`\n✅ Found ${messages.length} messages with attachments\n`);

    // 2. Display message details
    messages.forEach((msg, index) => {
      console.log(`Message ${index + 1}:`);
      console.log(`  ID: ${msg.id}`);
      console.log(`  Content: ${msg.content}`);
      console.log(`  Sender: ${msg.sender?.first_name} ${msg.sender?.last_name} (${msg.sender?.email})`);
      
      if (msg.attachment) {
        console.log(`  Attachment:`);
        console.log(`    - File: ${msg.attachment.original_filename}`);
        console.log(`    - Size: ${(msg.attachment.file_size / 1024).toFixed(2)} KB`);
        console.log(`    - Type: ${msg.attachment.mime_type}`);
        console.log(`    - PIN Required: ${msg.attachment.pin_required ? 'Yes' : 'No'}`);
        console.log(`    - Category: ${msg.attachment.category}`);
      }
      console.log('');
    });

    // 3. Test creating a message with attachment
    console.log('🔧 Testing message creation with attachment...\n');

    // First, find a test document
    const { data: testDoc } = await supabase
      .from('documents')
      .select('id')
      .limit(1)
      .single();

    if (testDoc) {
      // Find a test exchange and user
      const { data: testExchange } = await supabase
        .from('exchanges')
        .select('id')
        .limit(1)
        .single();

      const { data: testUser } = await supabase
        .from('users')
        .select('id')
        .limit(1)
        .single();

      if (testExchange && testUser) {
        const newMessage = {
          exchange_id: testExchange.id,
          sender_id: testUser.id,
          content: '📎 Test attachment with PIN protection',
          attachment_id: testDoc.id,
          message_type: 'file'
        };

        const { data: created, error: createError } = await supabase
          .from('messages')
          .insert(newMessage)
          .select(`
            *,
            sender:users!messages_sender_id_fkey(id, email, first_name, last_name),
            attachment:documents!messages_attachment_id_fkey(
              id,
              original_filename,
              file_size,
              mime_type,
              pin_required
            )
          `)
          .single();

        if (createError) {
          console.error('❌ Error creating message:', createError);
        } else {
          console.log('✅ Created message with attachment:');
          console.log(`  Message ID: ${created.id}`);
          console.log(`  Attachment: ${created.attachment?.original_filename || 'Unknown'}`);
          console.log(`  PIN Required: ${created.attachment?.pin_required ? 'Yes' : 'No'}`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMessageAttachments().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test error:', err);
  process.exit(1);
});