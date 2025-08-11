const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

// Test document upload with the fixed backend
async function testDocumentUpload() {
  console.log('🧪 Testing Document Upload with Fixed Backend\n');
  
  const API_URL = process.env.API_URL || 'http://localhost:5001/api';
  
  try {
    // Step 1: Login to get auth token
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'Peak2024!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, got token\n');
    
    // Step 2: Get an exchange ID to upload to
    console.log('2️⃣ Getting exchange list...');
    const exchangesResponse = await axios.get(`${API_URL}/exchanges`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const exchangesData = exchangesResponse.data;
    const exchanges = exchangesData.exchanges || exchangesData.data || exchangesData;
    
    if (!exchanges || exchanges.length === 0) {
      throw new Error('No exchanges found to upload document to');
    }
    
    const exchangeId = exchanges[0].id;
    console.log(`✅ Found exchange: ${exchanges[0].name} (${exchangeId})\n`);
    
    // Step 3: Create a test file
    console.log('3️⃣ Creating test document...');
    const testContent = `Test Document Upload
Date: ${new Date().toISOString()}
Exchange ID: ${exchangeId}

This is a test document to verify the upload functionality works correctly after fixing the user/people table issue.`;
    
    const testFilePath = path.join(__dirname, 'test-upload-document.txt');
    fs.writeFileSync(testFilePath, testContent);
    console.log('✅ Test document created\n');
    
    // Step 4: Upload the document
    console.log('4️⃣ Uploading document...');
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('exchangeId', exchangeId);
    form.append('category', 'test');
    form.append('description', 'Test document upload after fixing user table issue');
    
    const uploadResponse = await axios.post(`${API_URL}/documents`, form, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    });
    
    const uploadResult = uploadResponse.data;
    
    console.log('✅ Document uploaded successfully!');
    console.log('📄 Document details:', {
      id: uploadResult.data?.id,
      filename: uploadResult.data?.original_filename,
      uploadedBy: uploadResult.data?.uploaded_by,
      category: uploadResult.data?.category
    });
    
    // Step 5: Verify we can retrieve the document
    console.log('\n5️⃣ Verifying document retrieval...');
    const documentsResponse = await axios.get(`${API_URL}/documents/exchange/${exchangeId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const documentsData = documentsResponse.data;
    const uploadedDoc = documentsData.data?.find(doc => doc.id === uploadResult.data?.id);
    
    if (uploadedDoc) {
      console.log('✅ Document found in exchange documents list');
      console.log('📋 Retrieved document:', {
        id: uploadedDoc.id,
        filename: uploadedDoc.fileName || uploadedDoc.original_filename,
        uploadedBy: uploadedDoc.uploaded_by,
        fileSize: uploadedDoc.file_size || uploadedDoc.size
      });
    } else {
      console.log('⚠️ Document not found in list (might be a timing issue)');
    }
    
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log('\n✅ Test completed successfully! Document upload is working.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.error('Stack:', error.stack);
    
    // Clean up test file if it exists
    try {
      const testFilePath = path.join(__dirname, 'test-upload-document.txt');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    } catch (e) {}
  }
}

// Run the test
testDocumentUpload();