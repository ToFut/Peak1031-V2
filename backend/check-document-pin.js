require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkDocumentPin() {
  console.log('🔍 Checking document PIN details...\n');

  const documentId = '3190b74c-818a-4378-b05c-01ede5ae9cda';

  try {
    // Get the document
    const { data: doc, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error) {
      console.error('❌ Document fetch error:', error);
      return;
    }

    console.log('📄 Document details:');
    console.log('  Filename:', doc.original_filename);
    console.log('  PIN Required:', doc.pin_required);
    console.log('  PIN Hash:', doc.pin_hash);
    console.log('  Created:', doc.created_at);
    console.log('  Uploaded by:', doc.uploaded_by);

    // Since we don't know the PIN, let's check if there are any recent documents
    // where we can see the upload process or PIN creation
    console.log('\n📚 Recent documents with PINs:');
    const { data: recentDocs, error: recentError } = await supabase
      .from('documents')
      .select('id, original_filename, pin_required, pin_hash, created_at, uploaded_by')
      .eq('pin_required', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!recentError && recentDocs) {
      recentDocs.forEach((doc, index) => {
        console.log(`\n  Doc ${index + 1}:`);
        console.log(`    ID: ${doc.id}`);
        console.log(`    File: ${doc.original_filename}`);
        console.log(`    PIN Hash: ${doc.pin_hash ? doc.pin_hash.substring(0, 20) + '...' : 'None'}`);
        console.log(`    Created: ${doc.created_at}`);
      });
    }

    // Let's also check if there are documents without PIN that we can test with
    console.log('\n📂 Recent documents WITHOUT PIN requirements:');
    const { data: noPinDocs, error: noPinError } = await supabase
      .from('documents')
      .select('id, original_filename, pin_required, created_at')
      .eq('pin_required', false)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!noPinError && noPinDocs) {
      noPinDocs.forEach((doc, index) => {
        console.log(`\n  No-PIN Doc ${index + 1}:`);
        console.log(`    ID: ${doc.id}`);
        console.log(`    File: ${doc.original_filename}`);
        console.log(`    Created: ${doc.created_at}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

checkDocumentPin().then(() => {
  console.log('\n✅ PIN check completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});