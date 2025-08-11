require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testPinRecovery() {
  console.log('🔍 Testing PIN recovery for documents...\n');

  try {
    // Get the user who uploaded these documents
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', '278304de-568f-4138-b35b-6fdcfbd2f1ce')
      .single();

    if (userError) {
      console.error('❌ User fetch error:', userError);
      return;
    }

    console.log('👤 User details:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Default PIN: ${user.default_document_pin || 'Not set'}`);

    // Common PINs to test
    const commonPins = [
      user.default_document_pin,
      '1234',
      '12345',
      '123456',
      'admin',
      'password',
      'Peak1031',
      '1031',
      '0000',
      '1111'
    ].filter(Boolean); // Remove nulls/undefined

    // Get the document from the 401 error
    const documentId = '3190b74c-818a-4378-b05c-01ede5ae9cda';
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError) {
      console.error('❌ Document fetch error:', docError);
      return;
    }

    console.log('\n📄 Testing PIN for document:');
    console.log(`   File: ${doc.original_filename}`);
    console.log(`   PIN Hash: ${doc.pin_hash ? doc.pin_hash.substring(0, 30) + '...' : 'None'}`);

    if (doc.pin_hash) {
      console.log('\n🔐 Testing common PINs:');
      
      for (const pin of commonPins) {
        try {
          const isValid = await bcrypt.compare(pin, doc.pin_hash);
          console.log(`   "${pin}": ${isValid ? '✅ VALID' : '❌ Invalid'}`);
          
          if (isValid) {
            console.log(`\n🎉 FOUND CORRECT PIN: "${pin}"`);
            break;
          }
        } catch (err) {
          console.log(`   "${pin}": ❌ Error - ${err.message}`);
        }
      }
    }

    // Also test with documents that don't require PIN
    console.log('\n📂 Documents without PIN protection (for testing):');
    const { data: noPinDocs, error: noPinError } = await supabase
      .from('documents')
      .select('id, original_filename, pin_required, created_at')
      .eq('pin_required', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!noPinError && noPinDocs) {
      noPinDocs.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.original_filename} (ID: ${doc.id})`);
      });
    }

  } catch (error) {
    console.error('❌ PIN recovery test failed:', error);
  }
}

testPinRecovery().then(() => {
  console.log('\n✅ PIN recovery test completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});