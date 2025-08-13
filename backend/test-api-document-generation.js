const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const API_BASE_URL = 'http://127.0.0.1:5001/api';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDocumentGenerationAPI() {
  try {
    console.log('🚀 Testing Document Generation API\n');
    
    // Step 1: Get a test user token (admin)
    const { data: users } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('role', 'admin')
      .limit(1);
    
    if (!users || users.length === 0) {
      console.error('❌ No admin user found');
      return;
    }
    
    const testUser = users[0];
    console.log('Using test user:', testUser.email);
    
    // Create a test token (simplified for testing)
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { 
        userId: testUser.id,  // Changed from 'id' to 'userId' to match auth middleware
        email: testUser.email,
        role: testUser.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // Step 2: Get active templates
    console.log('\n📄 Testing GET /api/documents/templates/active');
    console.log('URL:', `${API_BASE_URL}/documents/templates/active`);
    console.log('Headers:', headers);
    try {
      const templatesResponse = await axios.get(
        `${API_BASE_URL}/documents/templates/active`,
        { headers, timeout: 5000 }
      );
      console.log('✅ Templates fetched:', templatesResponse.data?.data?.length || 0, 'templates');
      
      if (templatesResponse.data?.data?.length > 0) {
        console.log('First template:', templatesResponse.data.data[0].name);
      }
    } catch (error) {
      console.log('❌ Error fetching templates:');
      console.log('  Status:', error.response?.status);
      console.log('  Data:', error.response?.data);
      console.log('  Message:', error.message);
      if (error.code) console.log('  Code:', error.code);
    }
    
    // Step 3: Get an exchange to test with
    const { data: exchanges } = await supabase
      .from('exchanges')
      .select('id, name, exchange_number')
      .limit(1);
    
    if (!exchanges || exchanges.length === 0) {
      console.error('❌ No exchanges found');
      return;
    }
    
    const testExchange = exchanges[0];
    console.log('\n📋 Using exchange:', testExchange.name);
    
    // Step 4: Test document generation endpoint
    console.log('\n📄 Testing POST /api/documents/generate');
    
    // First get a template
    const { data: templates } = await supabase
      .from('document_templates')
      .select('id, name')
      .eq('is_active', true)
      .limit(1);
    
    if (templates && templates.length > 0) {
      const template = templates[0];
      console.log('Using template:', template.name);
      
      try {
        const generateResponse = await axios.post(
          `${API_BASE_URL}/documents/generate`,
          {
            templateId: template.id,
            exchangeId: testExchange.id,
            additionalData: {}
          },
          { headers }
        );
        
        console.log('✅ Document generated successfully!');
        console.log('Response:', generateResponse.data);
      } catch (error) {
        console.log('❌ Error generating document:');
        console.log('  Status:', error.response?.status);
        console.log('  Data:', error.response?.data);
        console.log('  Message:', error.message);
        if (error.response?.status === 500) {
          console.log('Server error details:', error.response.data);
        }
        if (error.code) console.log('  Code:', error.code);
      }
    } else {
      console.log('⚠️ No active templates found');
    }
    
    // Step 5: Test fetching generated documents
    console.log('\n📄 Testing GET /api/documents/exchange/:exchangeId');
    try {
      const docsResponse = await axios.get(
        `${API_BASE_URL}/documents/exchange/${testExchange.id}`,
        { headers }
      );
      console.log('✅ Documents fetched for exchange:');
      console.log('- Total documents:', docsResponse.data?.data?.length || 0);
      console.log('- Uploaded:', docsResponse.data?.summary?.uploaded || 0);
      console.log('- Generated:', docsResponse.data?.summary?.generated || 0);
    } catch (error) {
      console.log('❌ Error fetching documents:');
      console.log('  Status:', error.response?.status);
      console.log('  Data:', error.response?.data);
      console.log('  Message:', error.message);
      if (error.code) console.log('  Code:', error.code);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDocumentGenerationAPI();