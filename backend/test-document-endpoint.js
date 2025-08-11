require('dotenv').config();
const fetch = require('node-fetch');

async function testDocumentEndpoint() {
  console.log('🧪 Testing document endpoint...');
  
  try {
    // Login first
    const loginRes = await fetch('http://localhost:5001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@peak1031.com', password: 'Peak2024!' })
    });
    
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('✅ Logged in');
    
    // Get exchanges
    const exchangesRes = await fetch('http://localhost:5001/api/exchanges', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const exchanges = await exchangesRes.json();
    if (!exchanges.data || exchanges.data.length === 0) {
      console.log('❌ No exchanges found');
      return;
    }
    
    const exchangeId = exchanges.data[0].id;
    console.log('📋 Testing with exchange:', exchangeId);
    
    // Get documents for exchange
    const docsRes = await fetch(`http://localhost:5001/api/documents/exchange/${exchangeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const result = await docsRes.json();
    console.log('📄 Document response:', {
      status: docsRes.status,
      hasData: !!result.data,
      documentCount: result.data?.length || 0
    });
    
    if (result.data && result.data.length > 0) {
      console.log('\n📋 Document details:');
      result.data.forEach((doc, index) => {
        console.log(`\nDocument ${index + 1}:`);
        console.log('  Name:', doc.original_filename || doc.filename || 'Unknown');
        console.log('  Uploaded by:', doc.uploaded_by_name || 'Unknown');
        console.log('  Date:', doc.created_at);
        console.log('  Size:', doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown');
        console.log('  Category:', doc.category || 'General');
        console.log('  Type:', doc.document_type || 'Unknown');
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Make sure server is running
setTimeout(testDocumentEndpoint, 1000);