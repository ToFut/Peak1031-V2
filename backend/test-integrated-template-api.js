/**
 * Test Script for Integrated Template Generation API
 * Tests the full flow from frontend API endpoint to document generation
 */

require('dotenv').config();
const fetch = require('node-fetch');

// API configuration
const API_BASE_URL = 'http://localhost:5001/api';

// Test data
const TEST_TEMPLATE_ID = '620f8867-dbaa-4311-9d51-0096ee99603f'; // FK Test Template
const TEST_EXCHANGE_ID = '25c3bf84-7b55-4fbc-9b45-2d4c88497aec'; // EX-1002
const TEST_USER_ID = 'test-user-123';

async function testIntegratedTemplateGeneration() {
  console.log('🚀 Testing Integrated Template Generation API\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Prepare the request
    console.log('\n📋 Step 1: Preparing request...');
    const requestBody = {
      template_id: TEST_TEMPLATE_ID,
      exchange_id: TEST_EXCHANGE_ID,
      generation_data: {
        customField1: 'Test Value 1',
        customField2: 'Test Value 2',
        generatedAt: new Date().toISOString()
      },
      generated_by: TEST_USER_ID
    };
    
    console.log('Request body:', JSON.stringify(requestBody, null, 2));
    
    // Step 2: Make the API call (using the frontend's expected endpoint)
    console.log('\n📋 Step 2: Calling API endpoint...');
    console.log('Endpoint: POST /api/documents/templates/generate');
    
    const response = await fetch(`${API_BASE_URL}/documents/templates/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log('Response status:', response.status, response.statusText);
    
    // Step 3: Parse the response
    console.log('\n📋 Step 3: Processing response...');
    const responseData = await response.json();
    
    if (response.ok) {
      console.log('\n✅ Template Generation Successful!');
      console.log('=' .repeat(50));
      console.log('📄 Generated Document Details:');
      console.log('  - Success:', responseData.success);
      console.log('  - Message:', responseData.message);
      console.log('  - Document ID:', responseData.document_id);
      console.log('  - Download URL:', responseData.download_url);
      
      if (responseData.data) {
        console.log('\n📊 Additional Data:');
        console.log('  - Template Name:', responseData.data.template_name);
        console.log('  - Original Filename:', responseData.data.original_filename);
        console.log('  - File Path:', responseData.data.file_path);
        console.log('  - Warnings:', responseData.data.warnings?.length > 0 ? responseData.data.warnings : 'None');
      }
      
      // Step 4: Test downloading the document
      if (responseData.download_url) {
        console.log('\n📋 Step 4: Testing document download...');
        const downloadResponse = await fetch(responseData.download_url);
        if (downloadResponse.ok) {
          console.log('✅ Document is accessible at:', responseData.download_url);
        } else {
          console.log('⚠️ Document download returned status:', downloadResponse.status);
        }
      }
      
    } else {
      console.error('\n❌ Template Generation Failed!');
      console.error('Error response:', responseData);
      
      if (responseData.error) {
        console.error('\n💡 Error Details:');
        console.error('  - Message:', responseData.message);
        console.error('  - Error:', responseData.error);
      }
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Integration Test Completed!');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test Failed with exception:', error.message);
    console.error('Stack:', error.stack);
    
    // Additional debugging info
    console.log('\n💡 Debug Info:');
    console.log('Make sure the backend server is running on port 5001');
    console.log('Check that the template and exchange IDs exist in the database');
  }
}

// Run the test
testIntegratedTemplateGeneration().catch(console.error);