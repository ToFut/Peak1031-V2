/**
 * Debug script to examine what data is being used for document generation
 */
require('dotenv').config();
const DocumentTemplateService = require('./services/documentTemplateService');

const debugDocumentData = async () => {
  try {
    console.log('🔍 Debugging document data...');
    
    // Use the same exchange ID from the test
    const exchangeId = 'df7ea956-a936-45c6-b683-143e9dda5230';
    
    console.log('\n📋 Step 1: Getting exchange data directly...');
    const exchangeData = await DocumentTemplateService.getExchangeData(exchangeId);
    
    console.log('\n✅ Raw exchange data keys:', Object.keys(exchangeData));
    
    // Show key data points
    console.log('\n📊 Key data points:');
    console.log('- Client Name:', exchangeData['#Client.Name#']);
    console.log('- Client FirstName:', exchangeData['#Client.FirstName#']);
    console.log('- Client LastName:', exchangeData['#Client.LastName#']);
    console.log('- Client Email:', exchangeData['#Client.Email#']);
    console.log('- Property Address:', exchangeData['#Property.Address#']);
    console.log('- Exchange ID:', exchangeData['#Exchange.ID#']);
    console.log('- Exchange Name:', exchangeData['#Exchange.Name#']);
    
    console.log('\n📋 Step 2: Getting template...');
    const templateId = '584d4c62-32f4-4d05-a5e0-b79491e678c4';
    const template = await DocumentTemplateService.getTemplateById(templateId);
    
    console.log('Template:', {
      name: template.name,
      required_fields: template.required_fields,
      file_template: template.file_template?.substring(0, 200) + '...'
    });
    
    console.log('\n📋 Step 3: Testing validateRequiredFields...');
    const validatedData = await DocumentTemplateService.validateRequiredFields(template, exchangeData);
    
    console.log('\n📊 After validation:');
    console.log('- Client Name:', validatedData['#Client.Name#']);
    console.log('- Property Address:', validatedData['#Property.Address#']);
    console.log('- Exchange ID:', validatedData['#Exchange.ID#']);
    console.log('- Warnings:', validatedData.warnings?.length || 0);
    
    if (validatedData.warnings && validatedData.warnings.length > 0) {
      console.log('\n⚠️ Validation warnings:');
      validatedData.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack:', error.stack);
  }
};

debugDocumentData();