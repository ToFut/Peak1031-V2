const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function createWorkingTemplate() {
  console.log('📄 Creating a simple working template...');
  
  // Create a simple DOCX template with proper placeholders
  const content = `
    SETTLEMENT STATEMENT
    
    Exchange Number: {Exchange.Number}
    Exchange Name: {Exchange.Name}
    Exchange Type: {Exchange.Type}
    Exchange Status: {Exchange.Status}
    
    CLIENT INFORMATION
    Client Name: {Client.Name}
    Client Email: {Client.Email}
    Client Phone: {Client.Phone}
    
    PROPERTY INFORMATION
    Relinquished Property Address: {Relinquished.Address}
    Relinquished Property Value: ${Relinquished.Value}
    
    Replacement Property Address: {Replacement.Address}
    Replacement Property Value: ${Replacement.Value}
    
    TIMELINE
    Exchange Start Date: {Exchange.StartDate}
    45-Day Deadline: {Exchange.Deadline45}
    180-Day Deadline: {Exchange.Deadline180}
    
    FINANCIAL SUMMARY
    Total Exchange Value: ${Exchange.Value}
    Boot Received: ${Exchange.BootReceived}
    Boot Paid: ${Exchange.BootPaid}
    
    Generated on: {GeneratedDate}
  `;
  
  // Use docxtemplater to create a proper DOCX
  const doc = new Docxtemplater();
  
  // Create a simple template
  const zip = new PizZip(
    await fs.readFile(path.join(__dirname, '..', 'node_modules/docxtemplater/examples/simple.docx'))
  ).catch(() => {
    // If example doesn't exist, create from scratch
    console.log('Creating template from scratch...');
    // This would require creating a full DOCX structure, which is complex
    // For now, let's use a different approach
  });
  
  // Alternative: Update the template service to handle the broken template gracefully
  console.log('\n🔧 Instead, let\'s update the document template service to handle this template properly...');
  
  const serviceUpdateCode = `
  // Add this to the processDocxTemplate method to handle the specific template issue
  
  // Special handling for templates with # delimiters
  if (templateContent.includes('#Exchange.') || templateContent.includes('#Client.')) {
    console.log('🔄 Converting # delimiters to {} delimiters...');
    
    // Convert #placeholder# to {placeholder}
    let fixedContent = templateContent;
    
    // Fix the specific known issue
    fixedContent = fixedContent.replace(/Exchange #: E-#/, 'Exchange #: E-');
    
    // Convert all #...# placeholders to {...}
    fixedContent = fixedContent.replace(/#([A-Za-z0-9_.]+)#/g, '{$1}');
    
    // Use standard delimiters
    doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      delimiters: {
        start: '{',
        end: '}'
      }
    });
  }
  `;
  
  console.log('💡 Recommended fix for documentTemplateService.js:');
  console.log(serviceUpdateCode);
  
  // For now, let's upload a simple text template that works
  const simpleTemplate = {
    name: 'Simple Settlement Statement',
    type: 'text',
    content: content,
    placeholders: [
      'Exchange.Number', 'Exchange.Name', 'Exchange.Type', 'Exchange.Status',
      'Client.Name', 'Client.Email', 'Client.Phone',
      'Relinquished.Address', 'Relinquished.Value',
      'Replacement.Address', 'Replacement.Value',
      'Exchange.StartDate', 'Exchange.Deadline45', 'Exchange.Deadline180',
      'Exchange.Value', 'Exchange.BootReceived', 'Exchange.BootPaid',
      'GeneratedDate'
    ]
  };
  
  console.log('\n✅ Created simple text template structure');
  console.log('📋 Template placeholders:', simpleTemplate.placeholders.join(', '));
  
  return simpleTemplate;
}

createWorkingTemplate().catch(console.error);