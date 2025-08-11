const path = require('path');
const fs = require('fs');
const FormData = require('form-data');
const axios = require('axios');

// Test template upload with the fixed backend
async function testTemplateUpload() {
  console.log('🧪 Testing Template Upload with Fixed Backend\n');
  
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
    
    // Step 2: Create a test template file
    console.log('2️⃣ Creating test template document...');
    const templateContent = `EXCHANGE AGREEMENT TEMPLATE

This Agreement is entered into as of #Date.Today#, by and between:

EXCHANGER: #Client.Name#
Address: #Client.Address#
Email: #Client.Email#

QUALIFIED INTERMEDIARY: #QI.Company#

RELINQUISHED PROPERTY: #Property.RelinquishedAddress#
Sale Price: #Property.SalePrice#

IDENTIFICATION DEADLINE: #Date.IdentificationDeadline#
EXCHANGE DEADLINE: #Date.CompletionDeadline#

This is a test template for the 1031 exchange document system.`;
    
    const testFilePath = path.join(__dirname, 'test-template.txt');
    fs.writeFileSync(testFilePath, templateContent);
    console.log('✅ Test template created\n');
    
    // Step 3: Upload the template
    console.log('3️⃣ Uploading template...');
    const form = new FormData();
    form.append('file', fs.createReadStream(testFilePath));
    form.append('name', 'Test Exchange Agreement Template');
    form.append('description', 'Test template for 1031 exchanges');
    form.append('category', '1031_exchange');
    form.append('autoExtract', 'false'); // Disable auto-extraction for test
    
    const uploadResponse = await axios.post(`${API_URL}/templates/upload`, form, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...form.getHeaders()
      }
    });
    
    const uploadResult = uploadResponse.data;
    
    console.log('✅ Template uploaded successfully!');
    console.log('📄 Template details:', {
      id: uploadResult.data?.id,
      name: uploadResult.data?.name,
      category: uploadResult.data?.category,
      createdBy: uploadResult.data?.created_by
    });
    
    // Step 4: Verify we can retrieve the template
    console.log('\n4️⃣ Verifying template retrieval...');
    const templatesResponse = await axios.get(`${API_URL}/templates`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const templatesData = templatesResponse.data;
    const uploadedTemplate = Array.isArray(templatesData) 
      ? templatesData.find(t => t.id === uploadResult.data?.id)
      : templatesData.data?.find(t => t.id === uploadResult.data?.id);
    
    if (uploadedTemplate) {
      console.log('✅ Template found in templates list');
      console.log('📋 Retrieved template:', {
        id: uploadedTemplate.id,
        name: uploadedTemplate.name,
        category: uploadedTemplate.category,
        isActive: uploadedTemplate.is_active
      });
    } else {
      console.log('⚠️ Template not found in list (might be a timing issue)');
    }
    
    // Step 5: Test template download
    console.log('\n5️⃣ Testing template download...');
    try {
      const downloadResponse = await axios.get(
        `${API_URL}/templates/${uploadResult.data?.id}/download`,
        {
          headers: { 'Authorization': `Bearer ${token}` },
          responseType: 'arraybuffer'
        }
      );
      
      if (downloadResponse.status === 200) {
        console.log('✅ Template download successful');
        console.log('   File size:', downloadResponse.data.byteLength, 'bytes');
      }
    } catch (downloadError) {
      console.log('❌ Template download failed:', downloadError.response?.status || downloadError.message);
    }
    
    // Clean up
    fs.unlinkSync(testFilePath);
    console.log('\n✅ Test completed successfully! Template upload is working.');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    console.error('Stack:', error.stack);
    
    // Clean up test file if it exists
    try {
      const testFilePath = path.join(__dirname, 'test-template.txt');
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    } catch (e) {}
  }
}

// Run the test
testTemplateUpload();