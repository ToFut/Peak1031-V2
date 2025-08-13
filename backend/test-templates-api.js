/**
 * Test the Templates API endpoint directly
 */

require('dotenv').config();
const fetch = require('node-fetch');

// Test configuration
const API_BASE_URL = 'http://localhost:5001/api';

async function testTemplatesAPI() {
  console.log('🧪 Testing Templates API Endpoint\n');
  console.log('=' .repeat(50));
  
  try {
    // Test 1: Check if server is running
    console.log('\n📋 Step 1: Testing server connectivity...');
    try {
      const healthResponse = await fetch(`${API_BASE_URL}/health`, {
        method: 'GET',
        timeout: 5000
      });
      console.log('✅ Server is running on port 5001');
    } catch (error) {
      console.log('❌ Server is not running. Please start the backend server first.');
      console.log('Run: npm run dev:backend');
      return;
    }
    
    // Test 2: Try templates endpoint without auth
    console.log('\n📋 Step 2: Testing templates endpoint without auth...');
    const noAuthResponse = await fetch(`${API_BASE_URL}/templates`, {
      method: 'GET'
    });
    
    console.log('Status:', noAuthResponse.status, noAuthResponse.statusText);
    
    if (noAuthResponse.status === 401) {
      console.log('✅ Endpoint requires authentication (expected)');
      
      const noAuthData = await noAuthResponse.json();
      console.log('Response:', noAuthData);
    } else {
      const noAuthData = await noAuthResponse.text();
      console.log('Unexpected response:', noAuthData);
    }
    
    // Test 3: Try with a dummy token
    console.log('\n📋 Step 3: Testing with dummy auth token...');
    const dummyResponse = await fetch(`${API_BASE_URL}/templates`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer dummy-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', dummyResponse.status, dummyResponse.statusText);
    
    if (dummyResponse.status === 401) {
      console.log('✅ Invalid token rejected (expected)');
    }
    
    // Test 4: Check /documents/templates endpoint (alternative)
    console.log('\n📋 Step 4: Testing alternative endpoint /documents/templates...');
    const altResponse = await fetch(`${API_BASE_URL}/documents/templates`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer dummy-token',
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', altResponse.status, altResponse.statusText);
    
    if (altResponse.ok || altResponse.status === 401) {
      console.log('✅ Alternative endpoint exists');
      
      try {
        const altData = await altResponse.json();
        console.log('Alt endpoint response format:', typeof altData);
        if (Array.isArray(altData)) {
          console.log(`Alt endpoint would return ${altData.length} templates`);
        }
      } catch (e) {
        console.log('Alt endpoint response is not JSON');
      }
    }
    
    // Test 5: Direct database check (this should work)
    console.log('\n📋 Step 5: Direct database verification...');
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: dbTemplates, error: dbError } = await supabase
      .from('document_templates')
      .select('id, name, is_active')
      .limit(5);
    
    if (dbError) {
      console.error('❌ Database error:', dbError);
    } else {
      console.log(`✅ Database has ${dbTemplates?.length || 0} templates (showing first 5)`);
      if (dbTemplates && dbTemplates.length > 0) {
        dbTemplates.forEach((template, i) => {
          console.log(`  ${i + 1}. ${template.name} (Active: ${template.is_active})`);
        });
      }
    }
    
    // Test 6: Frontend expectation analysis
    console.log('\n📋 Step 6: Analyzing expected response format...');
    
    // Check what the frontend templateService expects
    const expectedFormat = {
      success: true,
      data: [] // Array of templates
    };
    
    console.log('Frontend expects this format:');
    console.log(JSON.stringify(expectedFormat, null, 2));
    
    console.log('\nOR direct array format:');
    console.log('[]  // Direct array of templates');
    
    // Test 7: Test the service method directly
    console.log('\n📋 Step 7: Testing DocumentTemplateService directly...');
    
    try {
      const DocumentTemplateService = require('./services/documentTemplateService');
      const templateService = new DocumentTemplateService();
      
      const templates = await templateService.getTemplates();
      console.log(`✅ DocumentTemplateService.getTemplates() returned ${templates?.length || 0} templates`);
      
      if (templates && templates.length > 0) {
        console.log('First template structure:');
        console.log(JSON.stringify({
          id: templates[0].id,
          name: templates[0].name,
          category: templates[0].category,
          is_active: templates[0].is_active
        }, null, 2));
      }
      
    } catch (serviceError) {
      console.error('❌ DocumentTemplateService error:', serviceError.message);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎯 Debugging Summary:');
    console.log('=' .repeat(50));
    console.log('1. Check if backend server is running');
    console.log('2. Check authentication in frontend');
    console.log('3. Check browser network tab for errors');
    console.log('4. Verify the frontend is calling the right endpoint');
    console.log('5. Check if frontend handles the response format correctly');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testTemplatesAPI().catch(console.error);