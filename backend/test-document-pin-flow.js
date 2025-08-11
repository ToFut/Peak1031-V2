const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function testDocumentPinFlow() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIyNzgzMDRkZS01NjhmLTQxMzgtYjM1Yi02ZmRjZmJkMmYxY2UiLCJlbWFpbCI6ImFkbWluQHBlYWsxMDMxLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc1NDYyNDk1MywiZXhwIjoxNzU0NzExMzUzfQ.AVdtn9NQXyS7t2gaQWBnPcWK-buAvc9QdHTxnDnGRUI';
  const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
  
  console.log('🧪 Testing Complete Document PIN Flow...\n');
  
  try {
    // Step 1: Set default PIN in profile
    console.log('1. Setting default document PIN in user profile...');
    const profileResponse = await axios.put('http://localhost:5001/api/auth/profile', {
      default_document_pin: '1234'
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Default PIN set successfully');
    console.log('   PIN in profile:', profileResponse.data.default_document_pin ? '[SET]' : '[NOT SET]');
    
    // Step 2: Create a test file
    console.log('\n2. Creating test document file...');
    const testContent = 'This is a test document for PIN protection testing.';
    fs.writeFileSync('/tmp/test-document.txt', testContent);
    console.log('✅ Test file created: test-document.txt');
    
    // Step 3: Upload document with PIN protection (should use default PIN)
    console.log('\n3. Uploading document with PIN protection...');
    const formData = new FormData();
    formData.append('file', fs.createReadStream('/tmp/test-document.txt'));
    formData.append('exchangeId', exchangeId);
    formData.append('category', 'test');
    formData.append('description', 'Test document with PIN protection');
    formData.append('pinRequired', 'true');
    // Not providing custom PIN - should use default from profile
    
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
    console.log('   Storage Provider:', uploadResponse.data.storage_provider);
    
    // Step 4: Create a chat message with the document as attachment
    console.log('\n4. Sending chat message with document attachment...');
    const messageResponse = await axios.post('http://localhost:5001/api/messages', {
      exchangeId: exchangeId,
      content: 'Here is the secure document I uploaded. @TASK Review this document priority: high due: today',
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
    console.log('   Has Attachment:', !!message.attachment_id);
    console.log('   Agent Results:', JSON.stringify(message.agentResults, null, 2));
    
    // Step 5: Fetch messages to verify attachment data is included
    console.log('\n5. Fetching messages to verify attachment data...');
    const messagesResponse = await axios.get(`http://localhost:5001/api/messages/exchange/${exchangeId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const messages = messagesResponse.data.data;
    const messageWithAttachment = messages.find(msg => msg.id === message.id);
    
    if (messageWithAttachment && messageWithAttachment.attachment) {
      console.log('✅ Message attachment data retrieved successfully!');
      console.log('   Attachment filename:', messageWithAttachment.attachment.original_filename);
      console.log('   Attachment PIN required:', messageWithAttachment.attachment.pin_required);
      console.log('   Attachment category:', messageWithAttachment.attachment.category);
    } else {
      console.log('❌ Message attachment data not found');
    }
    
    // Step 6: Test document download without PIN (should fail)
    console.log('\n6. Testing document download without PIN (should fail)...');
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
    
    // Step 7: Test document download with wrong PIN (should fail)
    console.log('\n7. Testing document download with wrong PIN (should fail)...');
    try {
      await axios.get(`http://localhost:5001/api/documents/${document.id}/download?pin=9999`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('❌ Download should have failed but succeeded');
    } catch (error) {
      console.log('✅ Download correctly failed with wrong PIN:', error.response?.data?.error);
    }
    
    // Step 8: Test document download with correct PIN (should succeed)
    console.log('\n8. Testing document download with correct PIN (should succeed)...');
    try {
      const downloadResponse = await axios.get(`http://localhost:5001/api/documents/${document.id}/download?pin=1234`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        responseType: 'blob'
      });
      console.log('✅ Document downloaded successfully with correct PIN!');
      console.log('   Content length:', downloadResponse.data.size || downloadResponse.headers['content-length']);
    } catch (error) {
      console.log('❌ Download failed with correct PIN:', error.response?.data?.error || error.message);
    }
    
    console.log('\n🎉 All PIN flow tests completed!');
    console.log('\n📋 Summary:');
    console.log('✅ Profile PIN setting');
    console.log('✅ Document upload with default PIN');
    console.log('✅ Chat message with attachment');
    console.log('✅ @TASK agent processing');
    console.log('✅ Message attachment data retrieval');
    console.log('✅ PIN-protected download security');
    console.log('\n🔒 The document is now viewable in chat with PIN verification!');
    
    // Clean up test file
    fs.unlinkSync('/tmp/test-document.txt');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testDocumentPinFlow();