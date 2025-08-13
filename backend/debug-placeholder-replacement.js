/**
 * Deep Dive Placeholder Replacement Debug Script
 * Tests every step of the placeholder replacement process
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const SmartPlaceholderService = require('./services/smartPlaceholderService');

// Test configuration - use the template ID that was just generated
const TEST_TEMPLATE_ID = '1c3d89d5-4610-4174-93b2-648f0b4e9428'; // From your error logs
const TEST_EXCHANGE_ID = '25c3bf84-7b55-4fbc-9b45-2d4c88497aec'; // Existing exchange

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugPlaceholderReplacement() {
  console.log('🕵️ Deep Dive: Placeholder Replacement Debug\n');
  console.log('=' .repeat(70));
  
  try {
    // Step 1: Get the template from database
    console.log('\n📋 Step 1: Fetching template from database...');
    const { data: template, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', TEST_TEMPLATE_ID)
      .single();
    
    if (templateError || !template) {
      console.error('❌ Template not found:', templateError);
      return;
    }
    
    console.log('✅ Template found:', {
      id: template.id,
      name: template.name,
      hasFileTemplate: !!template.file_template,
      fileTemplateType: typeof template.file_template,
      fileTemplateLength: template.file_template?.length || 0
    });
    
    // Step 2: Check if template has placeholders in the text content
    if (template.file_template) {
      console.log('\n📋 Step 2: Analyzing template content for placeholders...');
      const content = template.file_template;
      
      // Test different placeholder patterns
      const patterns = [
        { name: 'Hash format (#placeholder#)', regex: /#([^#]+)#/g },
        { name: 'Brace format ({placeholder})', regex: /\{([^}]+)\}/g },
        { name: 'Matter/Contact patterns', regex: /(?:Matter|Contact|Exchange|Client)\.[A-Za-z0-9\.\s]+/g }
      ];
      
      patterns.forEach(pattern => {
        const matches = [...content.matchAll(pattern.regex)];
        console.log(`${pattern.name}: Found ${matches.length} matches`);
        if (matches.length > 0) {
          matches.forEach((match, i) => {
            console.log(`  ${i + 1}. "${match[0]}" (captured: "${match[1] || match[0]}")`);
          });
        }
      });
      
      // Show first 500 chars of template content
      console.log('\n📄 Template content sample (first 500 chars):');
      console.log('"' + content.substring(0, 500) + '"...');
    }
    
    // Step 3: Test SmartPlaceholderService if template uses file upload
    const isFileTemplateUrl = template.file_template && 
      (template.file_template.startsWith('http://') || 
       template.file_template.startsWith('https://') ||
       template.file_template.includes('supabase.co/storage'));
    
    if (isFileTemplateUrl) {
      console.log('\n📋 Step 3: Testing SmartPlaceholderService with DOCX file...');
      
      // Extract file path from URL
      const urlParts = template.file_template.split('/storage/v1/object/public/documents/');
      if (urlParts.length >= 2) {
        const filePath = urlParts[1];
        console.log('📁 File path:', filePath);
        
        try {
          // Download the file
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('documents')
            .download(filePath);
          
          if (downloadError) {
            console.error('❌ Download error:', downloadError);
            return;
          }
          
          // Convert to buffer
          const buffer = Buffer.from(await fileData.arrayBuffer());
          console.log('✅ File downloaded successfully, size:', buffer.length, 'bytes');
          
          // Test SmartPlaceholderService step by step
          const smartService = new SmartPlaceholderService();
          
          // Step 3a: Test placeholder extraction
          console.log('\n📋 Step 3a: Extracting placeholders from DOCX...');
          const placeholders = await smartService.extractPlaceholdersFromTemplate(buffer);
          console.log('✅ Extracted placeholders:', placeholders.length);
          console.log('First 20 placeholders:');
          placeholders.slice(0, 20).forEach((placeholder, i) => {
            console.log(`  ${i + 1}. "${placeholder}"`);
          });
          
          // Step 3b: Test data fetching
          console.log('\n📋 Step 3b: Fetching exchange data...');
          const relatedData = await smartService.fetchAllRelatedData(TEST_EXCHANGE_ID);
          console.log('✅ Related data fetched:', {
            hasExchange: !!relatedData.exchange,
            hasClient: !!relatedData.client,
            hasCoordinator: !!relatedData.coordinator,
            participantsCount: relatedData.participants?.length || 0,
            propertiesCount: relatedData.properties?.length || 0
          });
          
          if (relatedData.exchange) {
            console.log('Exchange sample data:', {
              id: relatedData.exchange.id,
              number: relatedData.exchange.number || relatedData.exchange.exchange_number,
              name: relatedData.exchange.name || relatedData.exchange.exchange_name,
              status: relatedData.exchange.status
            });
          }
          
          if (relatedData.client) {
            console.log('Client sample data:', {
              first_name: relatedData.client.first_name,
              last_name: relatedData.client.last_name,
              email: relatedData.client.email,
              phone: relatedData.client.phone || relatedData.client.phone_mobile
            });
          }
          
          // Step 3c: Test placeholder mapping
          console.log('\n📋 Step 3c: Building placeholder map...');
          const placeholderMap = await smartService.buildPlaceholderMap(placeholders, TEST_EXCHANGE_ID);
          
          console.log('✅ Placeholder map built, sample mappings:');
          const sampleMappings = Object.entries(placeholderMap).slice(0, 10);
          sampleMappings.forEach(([key, value]) => {
            console.log(`  "${key}" → "${value}"`);
          });
          
          // Count how many placeholders have actual data vs fallbacks
          const mappedValues = Object.values(placeholderMap);
          const hasData = mappedValues.filter(v => v && v !== 'N/A' && !v.startsWith('[') && v !== 'Not specified').length;
          const hasPlaceholders = mappedValues.filter(v => v && v.startsWith('[') && v.endsWith(']')).length;
          const hasNa = mappedValues.filter(v => v === 'N/A' || v === 'Not specified').length;
          
          console.log('\n📊 Placeholder mapping analysis:');
          console.log(`  ${hasData} placeholders have real data`);
          console.log(`  ${hasPlaceholders} placeholders show [unmapped]`);
          console.log(`  ${hasNa} placeholders show N/A or Not specified`);
          
          // Step 3d: Test document processing (without saving)
          console.log('\n📋 Step 3d: Testing document processing...');
          const processedBuffer = await smartService.injectDataIntoTemplate(buffer, placeholderMap);
          console.log('✅ Document processed, output size:', processedBuffer.length, 'bytes');
          
          // Step 4: Compare with DocumentTemplateService transformation
          console.log('\n📋 Step 4: Testing DocumentTemplateService data transformation...');
          const DocumentTemplateService = require('./services/documentTemplateService');
          const templateService = new DocumentTemplateService();
          
          const exchangeData = await templateService.getExchangeData(TEST_EXCHANGE_ID);
          console.log('✅ DocumentTemplateService exchange data keys:', Object.keys(exchangeData).length);
          
          // Show sample of transformed data
          const sampleKeys = Object.keys(exchangeData).slice(0, 10);
          console.log('Sample transformed data:');
          sampleKeys.forEach(key => {
            console.log(`  "${key}" → "${exchangeData[key]}"`);
          });
          
        } catch (fileError) {
          console.error('❌ Error processing DOCX file:', fileError);
        }
      }
    } else {
      console.log('\n📋 Step 3: Template uses text content, not file upload');
    }
    
    console.log('\n' + '=' .repeat(70));
    console.log('🎯 ANALYSIS COMPLETE');
    console.log('=' .repeat(70));
    console.log('\nKey findings will help identify why placeholders aren\'t being replaced.');
    
  } catch (error) {
    console.error('\n❌ Debug script failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the comprehensive debug
debugPlaceholderReplacement().catch(console.error);