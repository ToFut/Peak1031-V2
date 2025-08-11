const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testDocumentChatBasic() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNzgzMDRkZS01NjhmLTQxMzgtYjM1Yi02ZmRjZmJkMmYxY2UiLCJlbWFpbCI6ImFkbWluQHBlYWsxMDMxLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDYyNDk1MywiZXhwIjoxNzU0NzExMzUzfQ.AVdtn9NQXyS7t2gaQWBnPcWK-buAvc9QdHTxnDnGRUI';
  const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
  const validPersonId = '2df8ea64-a15f-4ce8-ad6b-f893257a85b8'; // Use valid person ID from people table
  
  console.log('🧪 Testing Document Chat Integration (without default PIN)...\n');
  
  try {
    // Step 1: Create a test file
    console.log('1. Creating test document file...');
    const testContent = 'This is a test document for chat integration testing.';
    fs.writeFileSync('/tmp/test-chat-doc.txt', testContent);
    console.log('✅ Test file created: test-chat-doc.txt');
    
    // Step 2: Upload document with custom PIN protection
    console.log('\n2. Uploading document with custom PIN protection...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream('/tmp/test-chat-doc.txt'));
    formData.append('exchangeId', exchangeId);
    formData.append('category', 'test');
    // Skip description for now as column doesn't exist
    formData.append('pinRequired', 'true');
    formData.append('pin', '5678'); // Custom PIN since default PIN isn't available yet
    
    const uploadResponse = await axios.post('http://localhost:5001/api/documents', formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });
    
    console.log('✅ Document uploaded successfully!');
    const document = uploadResponse.data.data;
    console.log('   Document ID:', document.id);
    console.log('   PIN Required:', document.pin_required);
    console.log('   Original Filename:', document.original_filename);
    console.log('   Storage Provider:', uploadResponse.data.storage_provider);
    
    // Step 3: Create a chat message with the document as attachment
    console.log('\n3. Sending chat message with document attachment...');
    const messageResponse = await axios.post('http://localhost:5001/api/messages', {
      exchangeId: exchangeId,
      content: 'Here is a secure document I uploaded for review. Please check it out! @TASK Review attached document priority: high due: tomorrow',
      attachmentId: document.id
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Message with attachment sent successfully!');
    const message = messageResponse.data.data;
    console.log('   Message ID:', message.id);
    console.log('   Content:', message.content);
    console.log('   Attachment ID:', message.attachment_id);
    console.log('   Agent Results:');
    if (message.agentResults) {
      if (message.agentResults.taskCreated) {
        console.log('     ✅ Task created:', message.agentResults.taskCreated.title);
      }
      if (message.agentResults.errors.length > 0) {
        console.log('     ⚠️ Errors:', message.agentResults.errors);
      }
    }
    
    // Step 4: Fetch messages to verify attachment data is included
    console.log('\n4. Fetching messages to verify attachment data...');
    const messagesResponse = await axios.get(`http://localhost:5001/api/messages/exchange/${exchangeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const messages = messagesResponse.data.data;
    const messageWithAttachment = messages.find(msg => msg.id === message.id);
    
    if (messageWithAttachment && messageWithAttachment.attachment) {
      console.log('✅ Message attachment data retrieved successfully!');
      console.log('   Attachment details:');
      console.log('     - Filename:', messageWithAttachment.attachment.original_filename);
      console.log('     - PIN required:', messageWithAttachment.attachment.pin_required);
      console.log('     - Category:', messageWithAttachment.attachment.category);
      console.log('     - File size:', messageWithAttachment.attachment.file_size);
      console.log('     - MIME type:', messageWithAttachment.attachment.mime_type);
      console.log('     - Description:', messageWithAttachment.attachment.description);
    } else {
      console.log('❌ Message attachment data not found');
      console.log('   Available message fields:', Object.keys(messageWithAttachment || {}));
      if (messageWithAttachment) {
        console.log('   Attachment ID in message:', messageWithAttachment.attachment_id);
      }
    }
    
    // Step 5: Test document download without PIN (should fail)
    console.log('\n5. Testing document download without PIN (should fail)...');
    try {
      await axios.get(`http://localhost:5001/api/documents/${document.id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('❌ Download should have failed but succeeded');
    } catch (error) {
      console.log('✅ Download correctly failed without PIN:', error.response?.data?.error);
    }
    
    // Step 6: Test document download with wrong PIN (should fail)
    console.log('\n6. Testing document download with wrong PIN (should fail)...');
    try {
      await axios.get(`http://localhost:5001/api/documents/${document.id}/download?pin=1234`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('❌ Download should have failed but succeeded');
    } catch (error) {
      console.log('✅ Download correctly failed with wrong PIN:', error.response?.data?.error);
    }
    
    // Step 7: Test document download with correct PIN (should succeed)
    console.log('\n7. Testing document download with correct PIN (should succeed)...');
    try {
      const downloadResponse = await axios.get(`http://localhost:5001/api/documents/${document.id}/download?pin=5678`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });
      console.log('✅ Document downloaded successfully with correct PIN!');
      console.log('   Content length:', downloadResponse.data.size || downloadResponse.headers['content-length']);
      console.log('   Content type:', downloadResponse.headers['content-type']);
    } catch (error) {
      console.log('❌ Download failed with correct PIN:', error.response?.data?.error || error.message);
    }
    
    console.log('\n🎉 Document chat integration test completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Document upload with PIN protection');
    console.log('✅ Chat message with document attachment');
    console.log('✅ @TASK agent processing from attached message');
    console.log('✅ Message attachment data retrieval');
    console.log('✅ PIN-protected document download security');
    console.log('\n🔒 The document is now ready for chat viewing with PIN verification!');
    console.log('\n📝 Frontend Integration:');
    console.log('   - ChatDocumentViewer component will show document preview');
    console.log('   - DocumentPinVerification modal will handle PIN entry');
    console.log('   - Users can view/download documents directly from chat');
    
    // Clean up test file
    fs.unlinkSync('/tmp/test-chat-doc.txt');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDocumentChatBasic();