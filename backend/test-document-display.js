require('dotenv').config();
const supabaseService = require('./services/supabase');

async function testDocumentDisplay() {
  console.log('🧪 Testing document display with uploader information...');
  
  try {
    // Get an exchange
    const exchanges = await supabaseService.getExchanges({ limit: 1 });
    if (!exchanges || exchanges.length === 0) {
      console.log('❌ No exchanges found');
      return;
    }
    
    const exchangeId = exchanges[0].id;
    console.log('📋 Testing with exchange:', exchangeId);
    
    // Get documents with uploader info
    const { data: documents, error } = await supabaseService.client
      .from('documents')
      .select(`
        *,
        uploaded_by_user:users!documents_uploaded_by_fkey(id, first_name, last_name, email)
      `)
      .eq('exchange_id', exchangeId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching documents:', error);
      return;
    }
    
    console.log(`✅ Found ${documents?.length || 0} documents`);
    
    // Display document information
    documents?.forEach((doc, index) => {
      console.log(`\n📄 Document ${index + 1}:`);
      console.log(`   Name: ${doc.original_filename || doc.filename || 'Unknown'}`);
      console.log(`   Category: ${doc.category || 'General'}`);
      console.log(`   Uploaded: ${new Date(doc.created_at).toLocaleString()}`);
      console.log(`   Size: ${doc.file_size ? (doc.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Unknown'}`);
      console.log(`   Uploader: ${
        doc.uploaded_by_user 
          ? `${doc.uploaded_by_user.first_name || ''} ${doc.uploaded_by_user.last_name || ''}`.trim() || doc.uploaded_by_user.email
          : 'Unknown'
      }`);
      console.log(`   Storage: ${doc.storage_provider || 'Unknown'}`);
      console.log(`   Path: ${doc.file_path}`);
    });
    
    // Test download URL generation
    if (documents && documents.length > 0) {
      const testDoc = documents[0];
      console.log('\n🔗 Testing download for first document...');
      console.log(`   Document ID: ${testDoc.id}`);
      console.log(`   Expected download URL: /api/documents/${testDoc.id}/download`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testDocumentDisplay();