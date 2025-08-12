require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';

async function testFrontendTemplateLoad() {
  console.log('🧪 Testing frontend template loading simulation...');
  
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
    
    // Step 2: Simulate frontend template loading (like DocumentGenerationSystem component)
    console.log('\n📋 Step 2: Simulating frontend template loading...');
    const templatesResponse = await axios.get(`${API_BASE}/templates`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const templates = templatesResponse.data;
    console.log(`✅ Frontend loaded ${templates?.length || 0} templates from API`);
    
    if (templates && templates.length > 0) {
      console.log('\n📄 Templates available for dropdown:');
      templates.slice(0, 10).forEach((template, index) => {
        console.log(`   ${index + 1}. ${template.name} (${template.category})`);
        console.log(`      ID: ${template.id}`);
        console.log(`      Description: ${template.description || 'No description'}`);
      });
      
      if (templates.length > 10) {
        console.log(`   ... and ${templates.length - 10} more templates`);
      }
      
      console.log('\n✅ Template dropdown should now be populated!');
    } else {
      console.log('⚠️  No templates found - dropdown will be empty');
    }
    
    // Step 3: Test template generation endpoint
    console.log('\n📄 Step 3: Testing template generation endpoint...');
    if (templates && templates.length > 0) {
      const testTemplate = templates[0];
      const testExchangeId = 'test-exchange-id';
      
      try {
        const generateResponse = await axios.post(`${API_BASE}/documents/generate`, {
          templateId: testTemplate.id,
          exchangeId: testExchangeId,
          additionalData: {
            clientName: 'Test Client',
            propertyAddress: '123 Test St',
            propertyValue: '500000'
          }
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        console.log('✅ Document generation endpoint working');
        console.log('Generated document:', generateResponse.data);
      } catch (error) {
        console.log('❌ Document generation failed:', error.response?.status, error.response?.data?.error);
      }
    }
    
    console.log('\n🎉 Frontend template loading test completed!');
    console.log('\n💡 Summary:');
    console.log('   - Templates API endpoint: ✅ Working');
    console.log('   - Template count: ' + (templates?.length || 0));
    console.log('   - Frontend dropdown should now be populated');
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testFrontendTemplateLoad();




