require('dotenv').config();

const axios = require('axios');

async function testApiAttachmentFlow() {
  console.log('🔍 Testing complete API attachment flow...\n');

  const baseUrl = 'http://localhost:5001/api';
  let authToken = '';

  try {
    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in...');
    const loginResponse = await axios.post(`${baseUrl}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    authToken = loginResponse.data.token;
    console.log('✅ Login successful');

    // Step 2: Get messages for a specific exchange
    console.log('\n2️⃣ Fetching messages with attachments...');
    const messagesResponse = await axios.get(`${baseUrl}/messages/exchange/7354d84b-3d85-4c2c-aff3-d3349526880b`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    const messages = messagesResponse.data.data;
    console.log(`✅ Fetched ${messages.length} messages`);

    // Step 3: Find messages with attachments and verify data
    const messagesWithAttachments = messages.filter(msg => 
      msg.attachments && msg.attachments.length > 0
    );

    console.log(`\n3️⃣ Found ${messagesWithAttachments.length} messages with attachments:`);

    messagesWithAttachments.forEach((msg, index) => {
      console.log(`\n--- Message ${index + 1} ---`);
      console.log(`ID: ${msg.id}`);
      console.log(`Content: ${msg.content?.substring(0, 50)}...`);
      console.log(`Attachments: ${JSON.stringify(msg.attachments)}`);
      
      if (msg.attachment) {
        console.log(`✅ Attachment metadata present:`);
        console.log(`  - ID: ${msg.attachment.id}`);
        console.log(`  - Filename: ${msg.attachment.original_filename}`);
        console.log(`  - Size: ${msg.attachment.file_size}`);
        console.log(`  - MIME: ${msg.attachment.mime_type}`);
        console.log(`  - PIN Required: ${msg.attachment.pin_required}`);
      } else {
        console.log(`❌ No attachment metadata found`);
      }
      
      if (msg.attachment_id) {
        console.log(`Attachment ID set: ${msg.attachment_id}`);
      }
    });

    // Step 4: Test document download endpoint for one of the attachments
    if (messagesWithAttachments.length > 0 && messagesWithAttachments[0].attachment) {
      const docId = messagesWithAttachments[0].attachment.id;
      console.log(`\n4️⃣ Testing document download for ${docId}...`);
      
      try {
        // Test without PIN first (should work for non-PIN documents, or fail appropriately for PIN documents)
        const downloadResponse = await axios.get(`${baseUrl}/documents/${docId}/download`, {
          headers: { Authorization: `Bearer ${authToken}` },
          responseType: 'blob'
        });
        
        console.log(`✅ Document download successful (${downloadResponse.data.size} bytes)`);
      } catch (downloadError) {
        if (downloadError.response?.status === 400) {
          console.log(`🔒 Document requires PIN (expected for protected files)`);
        } else {
          console.log(`❌ Download failed: ${downloadError.message}`);
        }
      }
    }

    console.log('\n✅ API attachment flow test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('Error details:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      method: error.config?.method,
      stack: error.stack
    });
    if (error.response?.status === 401) {
      console.log('   → Authentication failed - check login credentials');
    }
  }
}

// Run the test
testApiAttachmentFlow().then(() => {
  console.log('\n🏁 Test finished');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Test error:', err);
  process.exit(1);
});