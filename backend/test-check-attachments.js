#!/usr/bin/env node
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkAttachments() {
  console.log('🔍 Checking for messages with actual attachment IDs...\n');

  try {
    // Look for messages where attachments array is not empty
    const { data: messages, error } = await supabase
      .from('messages')
      .select('id, content, attachments, created_at')
      .filter('attachments', 'cs', '{}')  // Contains array brackets
      .not('attachments', 'eq', '[]')     // Not empty array
      .limit(10);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`Found ${messages?.length || 0} messages with non-empty attachments\n`);

    // Also check recently created messages
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentMessages, error: recentError } = await supabase
      .from('messages')
      .select('id, content, attachments, created_at')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    if (!recentError && recentMessages) {
      console.log('\n📅 Recent messages (last hour):');
      recentMessages.forEach(msg => {
        console.log(`\nID: ${msg.id}`);
        console.log(`Content: ${msg.content?.substring(0, 50)}...`);
        console.log(`Attachments: ${JSON.stringify(msg.attachments)}`);
        console.log(`Created: ${msg.created_at}`);
      });
    }

    // Check if any documents were created recently
    const { data: recentDocs, error: docError } = await supabase
      .from('documents')
      .select('id, original_filename, created_at, uploaded_by')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!docError && recentDocs) {
      console.log('\n\n📄 Recent documents uploaded:');
      recentDocs.forEach(doc => {
        console.log(`\nDoc ID: ${doc.id}`);
        console.log(`Filename: ${doc.original_filename}`);
        console.log(`Created: ${doc.created_at}`);
        console.log(`Uploaded by: ${doc.uploaded_by}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
checkAttachments().then(() => {
  console.log('\n✅ Test completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test error:', err);
  process.exit(1);
});
