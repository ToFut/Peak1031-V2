require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

async function testTemplates() {
  console.log('🧪 Testing template functionality...');
  
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
    
    // Step 2: Test the templates endpoint
    console.log('\n📋 Step 2: Testing templates endpoint...');
    const templatesResponse = await axios.get(`${API_BASE}/templates`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const templates = templatesResponse.data;
    console.log(`✅ Templates endpoint response: ${templates?.length || 0} templates`);
    
    if (templates && templates.length > 0) {
      console.log('\n📄 Available templates:');
      templates.forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name} (${template.category})`);
        console.log(`      ID: ${template.id}`);
        console.log(`      Type: ${template.type}`);
        console.log(`      Active: ${template.isActive}`);
      });
    } else {
      console.log('⚠️  No templates found in database');
      console.log('💡 This is why the dropdown is empty!');
    }
    
    // Step 3: Test the active templates endpoint
    console.log('\n📋 Step 3: Testing active templates endpoint...');
    try {
      const activeTemplatesResponse = await axios.get(`${API_BASE}/templates/active`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const activeTemplates = activeTemplatesResponse.data;
      console.log(`✅ Active templates: ${activeTemplates?.length || 0} templates`);
    } catch (error) {
      console.log('❌ Active templates endpoint error:', error.response?.status);
    }
    
    // Step 4: Check if document_templates table exists
    console.log('\n🔍 Step 4: Checking database structure...');
    try {
      const tableCheckResponse = await axios.get(`${API_BASE}/admin/system-health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('✅ System health check successful');
      console.log('Database connection appears to be working');
    } catch (error) {
      console.log('❌ System health check failed:', error.response?.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testTemplates();
