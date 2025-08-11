require('dotenv').config();

const databaseService = require('./services/database');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugErrors() {
  console.log('🔍 Debugging the errors...\n');

  try {
    // Test 1: Test marking message as read
    console.log('1️⃣ Testing mark message as read...');
    const messageId = 'f89414fd-5387-4ac5-b046-9ab0b3ad158e'; // One of the messages with attachments
    const userId = '278304de-568f-4138-b35b-6fdcfbd2f1ce'; // Admin user ID

    try {
      const result = await databaseService.markMessageAsRead(messageId, userId);
      console.log('✅ Mark as read successful:', result.id);
    } catch (markError) {
      console.error('❌ Mark as read failed:', markError);
      console.error('Error details:', {
        message: markError.message,
        code: markError.code,
        hint: markError.hint,
        details: markError.details
      });
    }

    // Test 2: Check document PIN verification
    console.log('\n2️⃣ Testing document PIN verification...');
    const documentId = '3190b74c-818a-4378-b05c-01ede5ae9cda'; // Document from the error

    // First, get the document to see its structure
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) {
      console.error('❌ Document fetch failed:', docError);
    } else {
      console.log('✅ Document found:');
      console.log('  ID:', doc.id);
      console.log('  Filename:', doc.original_filename);
      console.log('  PIN Required:', doc.pin_required);
      console.log('  PIN Hash:', doc.pin_hash ? 'Present' : 'Missing');
      console.log('  Storage Provider:', doc.storage_provider);
      console.log('  File Path:', doc.file_path);
      
      // Test PIN verification if hash exists
      if (doc.pin_hash) {
        const bcrypt = require('bcrypt');
        const testPins = ['12345', '1234', '123456', 'admin'];
        
        console.log('\n  Testing PIN values:');
        for (const pin of testPins) {
          try {
            const isValid = await bcrypt.compare(pin, doc.pin_hash);
            console.log(`    PIN "${pin}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
          } catch (pinError) {
            console.log(`    PIN "${pin}": ❌ Error - ${pinError.message}`);
          }
        }
      } else {
        console.log('  ⚠️  No PIN hash found - PIN verification will fail');
      }
    }

    // Test 3: Check if user has access to the exchange
    console.log('\n3️⃣ Checking message and exchange access...');
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('*, exchanges!messages_exchange_id_fkey(id, title, coordinator_id)')
      .eq('id', messageId)
      .single();

    if (msgError) {
      console.error('❌ Message fetch failed:', msgError);
    } else {
      console.log('✅ Message details:');
      console.log('  Message ID:', message.id);
      console.log('  Exchange ID:', message.exchange_id);
      console.log('  Sender ID:', message.sender_id);
      console.log('  Read by:', message.read_by);
      console.log('  Exchange Title:', message.exchanges?.title);
      console.log('  Exchange Coordinator:', message.exchanges?.coordinator_id);
    }

  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

// Run the debug test
debugErrors().then(() => {
  console.log('\n🏁 Debug test completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Debug test error:', err);
  process.exit(1);
});