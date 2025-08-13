/**
 * Test Script for Document Template Generation
 * Tests the fixed template generation system
 */

require('dotenv').config();
const DocumentTemplateService = require('./services/documentTemplateService');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Initialize template service
const templateService = new DocumentTemplateService();

async function testTemplateGeneration() {
  console.log('🚀 Starting Template Generation Test\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Get a sample template
    console.log('\n📋 Step 1: Fetching templates...');
    const { data: templates, error: templatesError } = await supabase
      .from('document_templates')
      .select('*')
      .limit(1);
    
    if (templatesError || !templates || templates.length === 0) {
      console.log('❌ No templates found. Creating a test template...');
      
      // Create a test template
      const { data: newTemplate, error: createError } = await supabase
        .from('document_templates')
        .insert([{
          name: 'Test Template - Exchange Agreement',
          description: 'Test template for verifying generation',
          template_type: 'exchange_agreement',
          category: 'exchange',
          file_template: `
Exchange Agreement

Exchange Number: #Exchange.Number#
Client Name: #Client.Name#
Client Email: #Client.Email#
Exchange Value: #Exchange.Value#

Property Details:
Relinquished Property: #Property.RelinquishedAddress#
Sale Price: #Property.SalePrice#

Coordinator: #Coordinator.Name#
Date: #Date.Current#
          `,
          is_active: true,
          is_required: false,
          auto_generate: false,
          placeholders: {
            exchange: ['number', 'value', 'status'],
            client: ['name', 'email', 'phone'],
            property: ['address', 'salePrice']
          }
        }])
        .select()
        .single();
      
      if (createError) throw createError;
      templates.push(newTemplate);
      console.log('✅ Test template created');
    }
    
    const template = templates[0];
    console.log(`✅ Using template: ${template.name} (ID: ${template.id})`);
    
    // Step 2: Get a sample exchange
    console.log('\n📋 Step 2: Fetching exchanges...');
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select('*')
      .limit(1);
    
    if (exchangesError || !exchanges || exchanges.length === 0) {
      console.log('❌ No exchanges found. Please create an exchange first.');
      return;
    }
    
    const exchange = exchanges[0];
    console.log(`✅ Using exchange: ${exchange.exchange_number || exchange.id}`);
    
    // Step 3: Test template generation
    console.log('\n📋 Step 3: Generating document from template...');
    console.log('Template ID:', template.id);
    console.log('Exchange ID:', exchange.id);
    
    const result = await templateService.generateDocument(
      template.id,
      exchange.id,
      {
        testField: 'Test Value',
        generatedAt: new Date().toISOString()
      }
    );
    
    console.log('\n✅ Document Generated Successfully!');
    console.log('=' .repeat(50));
    console.log('📄 Document Details:');
    console.log('  - Document ID:', result.document.id);
    console.log('  - Filename:', result.document.original_filename);
    console.log('  - File Path:', result.document.file_path);
    console.log('  - Template Used:', result.template);
    console.log('  - Warnings:', result.warnings.length > 0 ? result.warnings : 'None');
    
    // Step 4: Verify the document was saved
    console.log('\n📋 Step 4: Verifying document in database...');
    const { data: savedDoc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', result.document.id)
      .single();
    
    if (docError) throw docError;
    
    console.log('✅ Document verified in database');
    console.log('  - Storage Path:', savedDoc.file_path);
    console.log('  - Public URL:', savedDoc.file_url);
    console.log('  - Size:', savedDoc.size, 'bytes');
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Template Generation Test Completed Successfully!');
    console.log('=' .repeat(50));
    
  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    console.error('Stack:', error.stack);
    
    // Additional debugging info
    if (error.message.includes('exchangeId')) {
      console.log('\n💡 Debug Info:');
      console.log('The exchangeId error has been fixed in the new implementation.');
      console.log('Make sure you are using the latest documentTemplateService.js');
    }
  }
}

// Run the test
testTemplateGeneration().catch(console.error);