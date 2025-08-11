#!/usr/bin/env node

/**
 * Comprehensive Test Script for File Upload Functionality
 * Tests chat, documents, and template upload functionality
 */

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE = 'http://localhost:5001/api';
const TEST_FILE_PATH = path.join(__dirname, 'test-upload.txt');

// Create a test file if it doesn't exist
const createTestFile = () => {
  const testContent = `Test upload file created at ${new Date().toISOString()}
This is a test file for comprehensive upload testing.
It contains multiple lines and some special characters: àáâãäåæçèéêë
File size should be manageable for upload testing.`;

  if (!fs.existsSync(TEST_FILE_PATH)) {
    fs.writeFileSync(TEST_FILE_PATH, testContent);
    console.log('✅ Created test file:', TEST_FILE_PATH);
  }
};

// Test authentication and get token
const authenticate = async () => {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    return response.data.token;
  } catch (error) {
    console.error('❌ Authentication failed:', error.response?.data || error.message);
    return null;
  }
};

// Test 1: Chat-style file upload with message
const testChatFileUpload = async (token, exchangeId) => {
  console.log('\n🧪 TEST 1: Chat File Upload with PIN Protection');
  
  try {
    // Step 1: Upload file via documents API (simulating chat upload)
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_FILE_PATH));
    formData.append('exchangeId', exchangeId);
    formData.append('category', 'chat');
    formData.append('pinRequired', 'true');
    formData.append('pin', '5678');

    const uploadResponse = await axios.post(`${API_BASE}/documents`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });

    console.log('📄 Document uploaded:', uploadResponse.data.data.id);
    const documentId = uploadResponse.data.data.id;

    // Step 2: Send message with attachment
    const messageResponse = await axios.post(`${API_BASE}/messages`, {
      exchangeId: exchangeId,
      content: 'Here is a test file with PIN protection! @TASK Test the attached file priority: high due: tomorrow',
      attachmentId: documentId
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('💬 Message with attachment sent:', messageResponse.data.data.id);

    // Step 3: Test PIN-protected download
    try {
      await axios.get(`${API_BASE}/documents/${documentId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('❌ Should have failed without PIN');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected download without PIN');
      } else {
        throw error;
      }
    }

    // Step 4: Test download with wrong PIN
    try {
      await axios.get(`${API_BASE}/documents/${documentId}/download?pin=1234`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('❌ Should have failed with wrong PIN');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected download with wrong PIN');
      } else {
        throw error;
      }
    }

    // Step 5: Test download with correct PIN
    const downloadResponse = await axios.get(`${API_BASE}/documents/${documentId}/download?pin=5678`, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'arraybuffer'
    });

    if (downloadResponse.status === 200 && downloadResponse.data.length > 0) {
      console.log('✅ Document downloaded successfully with correct PIN');
    }

    return {
      success: true,
      documentId,
      messageId: messageResponse.data.data.id
    };

  } catch (error) {
    console.error('❌ Chat upload test failed:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

// Test 2: Regular document upload (no PIN)
const testDocumentUpload = async (token, exchangeId) => {
  console.log('\n🧪 TEST 2: Regular Document Upload (No PIN)');
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_FILE_PATH));
    formData.append('exchangeId', exchangeId);
    formData.append('category', 'general');
    formData.append('pinRequired', 'false');

    const uploadResponse = await axios.post(`${API_BASE}/documents`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });

    console.log('📄 Document uploaded:', uploadResponse.data.data.id);
    const documentId = uploadResponse.data.data.id;

    // Test immediate download (no PIN required)
    const downloadResponse = await axios.get(`${API_BASE}/documents/${documentId}/download`, {
      headers: { 'Authorization': `Bearer ${token}` },
      responseType: 'arraybuffer'
    });

    if (downloadResponse.status === 200 && downloadResponse.data.length > 0) {
      console.log('✅ Document downloaded successfully (no PIN required)');
    }

    return {
      success: true,
      documentId
    };

  } catch (error) {
    console.error('❌ Document upload test failed:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

// Test 3: Template upload test
const testTemplateUpload = async (token) => {
  console.log('\n🧪 TEST 3: Template Document Upload');
  
  try {
    const formData = new FormData();
    formData.append('file', fs.createReadStream(TEST_FILE_PATH));
    formData.append('name', 'Test Template Document');
    formData.append('description', 'A test template for upload testing');

    const uploadResponse = await axios.post(`${API_BASE}/documents/templates/upload`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      }
    });

    console.log('📋 Template uploaded successfully');
    
    return { success: true };

  } catch (error) {
    console.error('❌ Template upload test failed:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

// Test 4: Get exchanges and verify our test exchange exists
const getTestExchange = async (token) => {
  try {
    const response = await axios.get(`${API_BASE}/exchanges`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const exchanges = response.data.exchanges || response.data.data || [];
    if (exchanges.length > 0) {
      console.log(`✅ Found ${exchanges.length} exchanges, using first one:`, exchanges[0].name || exchanges[0].exchange_name);
      return exchanges[0].id;
    } else {
      console.log('⚠️ No exchanges found, will create a test exchange');
      return 'ba7865ac-da20-404a-b609-804d15cb0467'; // Use known test exchange
    }
  } catch (error) {
    console.error('❌ Failed to get exchanges:', error.response?.data || error.message);
    return 'ba7865ac-da20-404a-b609-804d15cb0467'; // Fallback to test exchange
  }
};

// Test 5: Fetch messages to verify attachment handling
const testMessageFetching = async (token, exchangeId, messageId) => {
  console.log('\n🧪 TEST 5: Message Fetching with Attachments');
  
  try {
    const response = await axios.get(`${API_BASE}/messages/exchange/${exchangeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const messages = response.data.data || [];
    const testMessage = messages.find(msg => msg.id === messageId);

    if (testMessage && testMessage.attachment) {
      console.log('✅ Message with attachment found:', {
        id: testMessage.id,
        content: testMessage.content.substring(0, 50) + '...',
        hasAttachment: !!testMessage.attachment,
        attachmentFilename: testMessage.attachment?.originalFilename || testMessage.attachment?.original_filename
      });
      return { success: true };
    } else {
      console.log('⚠️ Message found but no attachment data');
      return { success: false, error: 'No attachment data in message' };
    }

  } catch (error) {
    console.error('❌ Message fetching test failed:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

// Main test runner
const runComprehensiveTests = async () => {
  console.log('🚀 Starting Comprehensive File Upload Tests');
  console.log('=' * 60);

  // Setup
  createTestFile();

  // Authenticate
  console.log('\n🔐 Authenticating...');
  const token = await authenticate();
  if (!token) {
    console.log('❌ Cannot proceed without authentication');
    return;
  }
  console.log('✅ Authentication successful');

  // Get test exchange
  const exchangeId = await getTestExchange(token);
  console.log('🏢 Using exchange:', exchangeId);

  const results = {
    chatUpload: null,
    documentUpload: null,
    templateUpload: null,
    messageFetching: null
  };

  // Run tests
  results.chatUpload = await testChatFileUpload(token, exchangeId);
  results.documentUpload = await testDocumentUpload(token, exchangeId);
  results.templateUpload = await testTemplateUpload(token);

  if (results.chatUpload.success && results.chatUpload.messageId) {
    results.messageFetching = await testMessageFetching(token, exchangeId, results.chatUpload.messageId);
  }

  // Summary
  console.log('\n' + '=' * 60);
  console.log('🎯 TEST RESULTS SUMMARY');
  console.log('=' * 60);
  console.log(`Chat Upload (with PIN): ${results.chatUpload.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Document Upload (no PIN): ${results.documentUpload.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Template Upload: ${results.templateUpload.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`Message Fetching: ${results.messageFetching?.success ? '✅ PASSED' : '❌ FAILED'}`);

  const allPassed = Object.values(results).every(result => result?.success !== false);
  console.log(`\n🎉 OVERALL: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);

  // Cleanup
  if (fs.existsSync(TEST_FILE_PATH)) {
    fs.unlinkSync(TEST_FILE_PATH);
    console.log('\n🧹 Cleaned up test file');
  }

  return results;
};

// Run if called directly
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

module.exports = { runComprehensiveTests };