require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

async function testDocumentDownloadAuth() {
  console.log('🧪 Testing document download authentication...');
  
  try {
    // Step 1: Login to get a valid token
    console.log('\n🔐 Step 1: Authenticating...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'Peak2024!'
    });
    
    if (!loginResponse.data.token) {
      console.error('❌ Login failed - no token received');
      return;
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Authentication successful');
    
    // Step 2: Get documents to find one to test
    console.log('\n📋 Step 2: Fetching documents...');
    const documentsResponse = await axios.get(`${API_BASE}/documents`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const documents = documentsResponse.data.data || documentsResponse.data;
    if (!documents || documents.length === 0) {
      console.log('❌ No documents found to test');
      return;
    }
    
    console.log(`✅ Found ${documents.length} documents`);
    
    // Step 3: Test document download
    const testDoc = documents[0];
    console.log(`\n📥 Step 3: Testing download for document: ${testDoc.id}`);
    console.log(`   Name: ${testDoc.original_filename || testDoc.filename || 'Unknown'}`);
    
    const downloadResponse = await axios.get(`${API_BASE}/documents/${testDoc.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
      responseType: 'blob'
    });
    
    console.log('✅ Document download successful!');
    console.log(`   Response status: ${downloadResponse.status}`);
    console.log(`   Content-Type: ${downloadResponse.headers['content-type']}`);
    console.log(`   Content-Length: ${downloadResponse.headers['content-length']}`);
    console.log(`   Data size: ${downloadResponse.data.size} bytes`);
    
    // Step 4: Test without authentication (should fail)
    console.log('\n🚫 Step 4: Testing download without authentication...');
    try {
      await axios.get(`${API_BASE}/documents/${testDoc.id}/download`, {
        responseType: 'blob'
      });
      console.log('❌ Download should have failed without auth!');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected download without authentication');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status}`);
      }
    }
    
    // Step 5: Test with invalid token
    console.log('\n🚫 Step 5: Testing download with invalid token...');
    try {
      await axios.get(`${API_BASE}/documents/${testDoc.id}/download`, {
        headers: { Authorization: 'Bearer invalid-token' },
        responseType: 'blob'
      });
      console.log('❌ Download should have failed with invalid token!');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✅ Correctly rejected download with invalid token');
      } else {
        console.log(`❌ Unexpected error: ${error.response?.status}`);
      }
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.status === 401) {
      console.log('💡 The issue is authentication - make sure you are logged in to the frontend');
    }
  }
}

testDocumentDownloadAuth();
