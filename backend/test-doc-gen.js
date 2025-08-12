/**
 * Test script to debug document generation failure
 */
require('dotenv').config();
const jwt = require('jsonwebtoken');

const testDocumentGeneration = async () => {
  try {
    console.log('🧪 Testing document generation...');
    
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
    
    // First, get a template to test with
    console.log('\n📋 Step 1: Getting a template to test with...');
    const templatesResponse = await fetch(`${baseURL}/templates`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!templatesResponse.ok) {
      console.log('❌ Failed to get templates:', templatesResponse.status);
      return;
    }
    
    const templatesResult = await templatesResponse.json();
    const firstTemplate = templatesResult.data?.[0];
    
    if (!firstTemplate) {
      console.log('❌ No templates found');
      return;
    }
    
    console.log('✅ Using template:', {
      id: firstTemplate.id,
      name: firstTemplate.name,
      hasFileTemplate: !!firstTemplate.file_template,
      hasFilePath: !!firstTemplate.file_path,
      requiredFields: firstTemplate.required_fields?.length || 0
    });
    
    // Get an exchange to test with (use the known exchange ID)
    console.log('\n📋 Step 2: Using known exchange...');
    const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
    
    // Test document generation
    console.log('\n📋 Step 3: Testing document generation...');
    const generateResponse = await fetch(`${baseURL}/templates/${firstTemplate.id}/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        exchangeId: exchangeId,
        additionalData: {
          exchanger_name: 'Test Exchange LLC',
          test_field: 'Test Value'
        }
      })
    });
    
    console.log('\n📊 Generation Response Status:', generateResponse.status);
    
    if (!generateResponse.ok) {
      console.log('❌ Document generation failed');
      const errorText = await generateResponse.text();
      console.log('Error Response:', errorText);
      
      // Try to parse as JSON for more detailed error
      try {
        const errorJson = JSON.parse(errorText);
        console.log('Parsed Error:', errorJson);
      } catch (e) {
        console.log('Raw Error Text:', errorText);
      }
    } else {
      const result = await generateResponse.json();
      console.log('✅ Document generation successful:', {
        success: result.success,
        message: result.message,
        hasDocument: !!result.data?.document,
        documentId: result.data?.document?.id
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
};

testDocumentGeneration();