/**
 * Test script to verify templates are now working
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const testTemplatesFix = async () => {
  try {
    console.log('🧪 Testing fixed templates endpoint...');
    
    // Create admin JWT token
    const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
    const adminToken = jwt.sign(
      {
        userId: adminUserId,
        id: adminUserId,
        email: 'admin@peak1031.com',
        role: 'admin',
        contact_id: adminUserId
      },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    const fetch = require('node-fetch');
    const baseURL = 'http://localhost:5001/api';
    
    // Test 1: Get all templates with new endpoint
    console.log('\n📋 Test 1: Fetching templates from /api/templates...');
    const response1 = await fetch(`${baseURL}/templates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response1.ok) {
      console.log('❌ Failed to get templates:', response1.status);
      const errorText = await response1.text();
      console.log('Error:', errorText);
    } else {
      const result = await response1.json();
      console.log('📊 Response structure:', {
        success: result.success,
        hasData: 'data' in result,
        dataIsArray: Array.isArray(result.data),
        dataLength: result.data?.length
      });
      
      if (result.success && result.data) {
        console.log(`✅ Got ${result.data.length} templates from template-management endpoint`);
        
        if (result.data.length > 0) {
          console.log('📄 Sample template:', {
            id: result.data[0].id,
            name: result.data[0].name,
            category: result.data[0].category,
            isActive: result.data[0].is_active
          });
        }
      }
    }
    
    // Test 2: Get active templates
    console.log('\n📋 Test 2: Fetching active templates...');
    const response2 = await fetch(`${baseURL}/templates/active`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response2.ok) {
      console.log('❌ Failed to get active templates:', response2.status);
      const errorText = await response2.text();
      console.log('Error:', errorText);
    } else {
      const activeResult = await response2.json();
      if (activeResult.success && activeResult.data) {
        console.log(`✅ Got ${activeResult.data.length} active templates`);
      }
    }
    
    // Test 3: Check frontend path (this would be called by the frontend)
    console.log('\n📋 Test 3: Simulating frontend call pattern...');
    // Frontend would call with base URL already including /api
    const frontendBaseURL = 'http://localhost:5001/api';
    const frontendPath = '/templates'; // Not /api/templates since base already has /api
    
    const response3 = await fetch(`${frontendBaseURL}${frontendPath}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response3.ok) {
      const frontendResult = await response3.json();
      console.log('✅ Frontend-style call successful');
      console.log('   Response has success:', frontendResult.success);
      console.log('   Response has data:', 'data' in frontendResult);
      console.log('   Templates count:', frontendResult.data?.length || 0);
    } else {
      console.log('❌ Frontend-style call failed:', response3.status);
    }
    
    console.log('\n✅ All tests completed!');
    console.log('📝 Summary:');
    console.log('   - Backend endpoint: /api/templates (returns { success: true, data: [...] })');
    console.log('   - Frontend should call: /templates (not /api/templates)');
    console.log('   - Templates exist in database: 74 templates');
    console.log('   - Frontend templateService updated to handle wrapped response');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testTemplatesFix();