#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const API_BASE = 'http://localhost:5001/api';

const testUpload = async () => {
  console.log('🧪 Testing Simple File Upload');

  // Create test file
  const testContent = 'Test file for upload debugging';
  fs.writeFileSync('test-upload.txt', testContent);

  try {
    // Authenticate
    const authResponse = await axios.post(`${API_BASE}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    const token = authResponse.data.token;
    console.log('✅ Authentication successful');

    // Try upload
    const formData = new FormData();
    formData.append('file', fs.createReadStream('test-upload.txt'));
    formData.append('exchangeId', 'ba7865ac-da20-404a-b609-804d15cb0467');
    formData.append('category', 'test');
    formData.append('pinRequired', 'false');

    console.log('📤 Uploading file...');
    
    const uploadResponse = await axios.post(`${API_BASE}/documents`, formData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...formData.getHeaders()
      },
      timeout: 30000
    });

    console.log('✅ Upload successful!', uploadResponse.data);

  } catch (error) {
    console.error('❌ Upload failed:', error.response?.data || error.message);
    if (error.response?.status) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  } finally {
    // Cleanup
    if (fs.existsSync('test-upload.txt')) {
      fs.unlinkSync('test-upload.txt');
    }
  }
};

testUpload().catch(console.error);