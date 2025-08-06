const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5001/api';

async function testTemplateUpload() {
  try {
    // 1. Login to get token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'TempPass123!'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');

    // 2. Get template documents
    console.log('\n📄 Fetching template documents...');
    try {
      const templatesResponse = await axios.get(`${API_URL}/documents/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Templates fetched successfully');
      console.log(`📋 Found ${templatesResponse.data.length} templates`);
      templatesResponse.data.forEach(template => {
        console.log(`   - ${template.name} (${template.category})`);
      });
    } catch (error) {
      console.error('❌ Error fetching templates:', error.response?.data || error.message);
    }

    // 3. Create a test file to upload
    const testFileName = 'Test_Exchange_Agreement.pdf';
    const testFilePath = path.join(__dirname, testFileName);
    
    // Create a simple test file if it doesn't exist
    if (!fs.existsSync(testFilePath)) {
      console.log('\n📝 Creating test file...');
      fs.writeFileSync(testFilePath, 'This is a test PDF file content');
    }

    // 4. Upload template document
    console.log('\n📤 Uploading template document...');
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('category', 'exchange-agreement');
    form.append('name', 'Test Exchange Agreement');
    form.append('description', 'A test template for exchange agreements');
    form.append('tags', JSON.stringify(['test', 'exchange', 'agreement']));

    try {
      const uploadResponse = await axios.post(`${API_URL}/documents/templates/upload`, form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${token}`
        }
      });
      console.log('✅ Template uploaded successfully:', uploadResponse.data);
    } catch (error) {
      console.error('❌ Error uploading template:', error.response?.data || error.message);
      if (error.response?.data?.stack) {
        console.error('Stack trace:', error.response.data.stack);
      }
    }

    // Clean up test file
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
      console.log('\n🧹 Test file cleaned up');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testTemplateUpload();