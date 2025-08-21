const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

async function testDocumentUpload() {
  console.log('🧪 Testing Document Upload Functionality');
  console.log('=====================================');

  const baseURL = 'http://localhost:5001/api';
  
  // Test credentials - replace with actual test user
  const testUser = {
    email: 'admin@peak1031.com',
    password: 'admin123'
  };

  try {
    // Step 1: Login to get token
    console.log('🔐 Step 1: Logging in...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });

    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Login successful');
    console.log(`👤 Logged in as: ${user.email} (${user.id}) - Role: ${user.role}`);

    // Step 2: Get user's exchanges
    console.log('\n📋 Step 2: Getting user exchanges...');
    const exchangesResponse = await axios.get(`${baseURL}/exchanges`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const exchanges = exchangesResponse.data.data || [];
    console.log(`✅ Found ${exchanges.length} exchanges`);

    if (exchanges.length === 0) {
      console.log('❌ No exchanges found for user');
      return;
    }

    const testExchangeId = exchanges[0].id;
    console.log(`📁 Using exchange ID: ${testExchangeId}`);

    // Step 3: Test document upload
    console.log('\n📤 Step 3: Testing document upload...');
    
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-document.txt');
    const testContent = 'This is a test document for upload testing.';
    fs.writeFileSync(testFilePath, testContent);

    const formData = new FormData();
    formData.append('file', fs.createReadStream(testFilePath));
    formData.append('exchangeId', testExchangeId);
    formData.append('category', 'test');

    const uploadResponse = await axios.post(`${baseURL}/documents`, formData, {
      headers: {
        ...formData.getHeaders(),
        Authorization: `Bearer ${token}`
      }
    });

    console.log('✅ Upload successful!');
    console.log('📄 Upload response:', uploadResponse.data);

    // Clean up test file
    fs.unlinkSync(testFilePath);

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    console.error('❌ Full error:', error);
    
    if (error.response) {
      console.error('📊 Response status:', error.response.status);
      console.error('📊 Response headers:', error.response.headers);
    }
  }
}

testDocumentUpload();
