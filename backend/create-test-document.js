require('dotenv').config();
const databaseService = require('./services/database');
const bcrypt = require('bcrypt');

async function createTestDocument() {
  console.log('🔄 Creating test document with known PIN...\n');

  try {
    // Create a test document with PIN "1234"
    const testPin = '1234';
    const pinHash = await bcrypt.hash(testPin, 12);

    const documentData = {
      original_filename: 'test-document-pin-1234.txt',
      stored_filename: 'test-pin-doc.txt',
      file_path: 'test/test-pin-doc.txt',
      file_size: 50,
      mime_type: 'text/plain',
      exchange_id: 'df7ea956-a936-45c6-b683-143e9dda5230', // Known exchange ID
      uploaded_by: '2df8ea64-a15f-4ce8-ad6b-f893257a85b8', // Known person ID
      category: 'test',
      pin_required: true,
      pin_hash: pinHash,
      storage_provider: 'local'
    };

    console.log(`📄 Creating document with PIN "${testPin}"`);
    const document = await databaseService.createDocument(documentData);
    
    console.log('✅ Test document created successfully:');
    console.log(`   Document ID: ${document.id}`);
    console.log(`   Filename: ${document.original_filename}`);
    console.log(`   PIN: ${testPin}`);
    console.log(`   PIN Hash: ${pinHash}`);

    // Also create one without PIN for testing
    const noPinDocumentData = {
      original_filename: 'test-document-no-pin.txt',
      stored_filename: 'test-no-pin-doc.txt',
      file_path: 'test/test-no-pin-doc.txt',
      file_size: 30,
      mime_type: 'text/plain',
      exchange_id: 'df7ea956-a936-45c6-b683-143e9dda5230',
      uploaded_by: '2df8ea64-a15f-4ce8-ad6b-f893257a85b8',
      category: 'test',
      pin_required: false,
      pin_hash: null,
      storage_provider: 'local'
    };

    console.log('\n📄 Creating document without PIN...');
    const noPinDocument = await databaseService.createDocument(noPinDocumentData);
    
    console.log('✅ No-PIN test document created successfully:');
    console.log(`   Document ID: ${noPinDocument.id}`);
    console.log(`   Filename: ${noPinDocument.original_filename}`);

    console.log('\n🧪 Testing PIN verification:');
    const testPins = ['1234', '12345', 'wrong'];
    
    for (const pin of testPins) {
      const isValid = await bcrypt.compare(pin, pinHash);
      console.log(`   PIN "${pin}": ${isValid ? '✅ Valid' : '❌ Invalid'}`);
    }

    console.log('\n📋 Test Document Information:');
    console.log('=' .repeat(50));
    console.log('WITH PIN:');
    console.log(`  Document ID: ${document.id}`);
    console.log(`  PIN: ${testPin}`);
    console.log(`  Test URL: GET /api/documents/${document.id}/download?pin=${testPin}`);
    console.log('\nWITHOUT PIN:');
    console.log(`  Document ID: ${noPinDocument.id}`);
    console.log(`  Test URL: GET /api/documents/${noPinDocument.id}/download`);
    console.log('=' .repeat(50));

  } catch (error) {
    console.error('❌ Failed to create test document:', error);
  }
}

createTestDocument().then(() => {
  console.log('\n🏁 Test document creation completed');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error:', err);
  process.exit(1);
});