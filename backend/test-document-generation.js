const { createClient } = require('@supabase/supabase-js');
const DocumentTemplateService = require('./services/documentTemplateService');
const SmartPlaceholderService = require('./services/smartPlaceholderService');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDocumentGeneration() {
  try {
    console.log('🚀 Testing Document Generation System\n');
    
    // Step 1: Get a sample exchange
    const { data: exchanges, error: exchangeError } = await supabase
      .from('exchanges')
      .select('id, name, exchange_number, client_id')
      .limit(1);
    
    if (exchangeError || !exchanges || exchanges.length === 0) {
      console.error('❌ No exchanges found to test with');
      return;
    }
    
    const exchange = exchanges[0];
    console.log('✅ Using exchange:', exchange.name);
    console.log('   - ID:', exchange.id);
    console.log('   - Number:', exchange.exchange_number);
    
    // Step 2: Test data extraction
    console.log('\n📊 Testing Data Extraction:');
    const smartService = new SmartPlaceholderService();
    const relatedData = await smartService.fetchAllRelatedData(exchange.id);
    
    console.log('   - Exchange data:', !!relatedData.exchange ? '✅' : '❌');
    console.log('   - Client data:', !!relatedData.client ? '✅' : '❌');
    if (relatedData.client) {
      console.log('     • Name:', relatedData.client.first_name, relatedData.client.last_name);
      console.log('     • Email:', relatedData.client.email || 'N/A');
    }
    console.log('   - Coordinator:', !!relatedData.coordinator ? '✅' : '❌');
    
    // Step 3: Test placeholder mapping
    console.log('\n🔤 Testing Placeholder Mapping:');
    const testPlaceholders = [
      'Matter.Number',
      'Matter.Client',
      'Contact.FirstName',
      'Contact.LastName',
      'Contact.Email',
      'Contact.Street1',
      'Matter.Rel Property Address'
    ];
    
    for (const placeholder of testPlaceholders) {
      const value = smartService.mapPlaceholderToData(placeholder, relatedData);
      console.log(`   - ${placeholder}: "${value}"`);
    }
    
    // Step 4: Get a template to test with
    console.log('\n📄 Testing Template Processing:');
    const { data: templates, error: templateError } = await supabase
      .from('document_templates')
      .select('id, name')
      .eq('is_active', true)
      .limit(1);
    
    if (templates && templates.length > 0) {
      const template = templates[0];
      console.log('   - Using template:', template.name);
      
      // Try to generate a document
      const docService = new DocumentTemplateService();
      try {
        const result = await docService.generateDocument(
          template.id,
          exchange.id,
          {}
        );
        
        if (result.success) {
          console.log('   ✅ Document generated successfully!');
          console.log('   - Filename:', result.document.original_filename);
          console.log('   - Path:', result.document.file_path);
          if (result.warnings && result.warnings.length > 0) {
            console.log('   ⚠️ Warnings:', result.warnings);
          }
        } else {
          console.log('   ❌ Document generation failed');
        }
      } catch (genError) {
        console.log('   ❌ Error generating document:', genError.message);
      }
    } else {
      console.log('   ⚠️ No active templates found');
    }
    
    console.log('\n✅ Test completed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

// Run the test
testDocumentGeneration();
