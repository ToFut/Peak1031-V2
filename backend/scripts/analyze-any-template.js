const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const AdmZip = require('adm-zip');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function analyzeTemplate(templateId) {
  console.log(`🔍 Analyzing template: ${templateId}`);
  
  try {
    // First, get template info from database
    const { data: template, error: dbError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single();
    
    if (dbError) {
      console.error('❌ Error fetching template from database:', dbError);
      return;
    }
    
    console.log('📋 Template info:', {
      id: template.id,
      name: template.name,
      type: template.type,
      file_template: template.file_template ? 'Present' : 'None'
    });
    
    if (!template.file_template) {
      console.log('ℹ️  This is a text template, no DOCX file to analyze');
      return;
    }
    
    // Extract file path from URL
    const urlMatch = template.file_template.match(/\/documents\/(.+)$/);
    if (!urlMatch) {
      console.error('❌ Could not extract file path from URL:', template.file_template);
      return;
    }
    
    const filePath = urlMatch[1];
    console.log('📁 File path:', filePath);
    
    // Download the template
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(filePath);
    
    if (downloadError) {
      console.error('❌ Error downloading template:', downloadError);
      return;
    }
    
    const buffer = Buffer.from(await fileData.arrayBuffer());
    console.log('✅ Template downloaded, size:', buffer.length, 'bytes');
    
    // Save for analysis
    const localFileName = `template-${templateId}.docx`;
    await fs.writeFile(localFileName, buffer);
    console.log(`💾 Saved to ${localFileName}`);
    
    // Analyze with docxtemplater
    try {
      const zip = new PizZip(buffer);
      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        delimiters: {
          start: '#',
          end: '#'
        }
      });
      
      console.log('✅ Template is valid with # delimiters!');
    } catch (error) {
      console.error('\n❌ Template has errors with # delimiters:');
      
      if (error.properties && error.properties.errors) {
        error.properties.errors.forEach((err, index) => {
          console.log(`\nError ${index + 1}:`);
          console.log('  Type:', err.name);
          console.log('  Message:', err.message);
          console.log('  File:', err.properties?.file || 'Unknown');
          console.log('  Context:', err.properties?.context || 'Unknown');
          console.log('  Explanation:', err.properties?.explanation || 'Unknown');
          console.log('  Offset:', err.properties?.offset || 'Unknown');
        });
      }
      
      // Try to identify specific issues
      const zip = new AdmZip(buffer);
      console.log('\n🔍 Analyzing XML files for issues...');
      
      zip.getEntries().forEach(entry => {
        if (entry.entryName.endsWith('.xml') && !entry.entryName.includes('rels')) {
          const content = entry.getData().toString('utf8');
          
          // Look for problematic patterns
          const issues = [];
          
          // Check for split placeholders
          const splitPattern = /#<\/w:t><\/w:r>.*?<w:r.*?<w:t>[^#]+<\/w:t><\/w:r>.*?<w:r.*?<w:t>#/gs;
          const splitMatches = content.match(splitPattern);
          if (splitMatches) {
            issues.push(`Found ${splitMatches.length} split placeholder(s)`);
          }
          
          // Check for single # characters
          const singleHashMatches = content.match(/#(?![^<>]*#)/g);
          if (singleHashMatches) {
            issues.push(`Found ${singleHashMatches.length} potential unclosed tag(s)`);
          }
          
          if (issues.length > 0) {
            console.log(`\n📄 ${entry.entryName}:`);
            issues.forEach(issue => console.log(`   - ${issue}`));
          }
        }
      });
      
      // Try with {} delimiters
      console.log('\n🔄 Trying with {} delimiters...');
      try {
        const zip2 = new PizZip(buffer);
        
        // Convert delimiters
        const files = Object.keys(zip2.files);
        files.forEach(fileName => {
          if (fileName.endsWith('.xml') && !fileName.includes('rels')) {
            let content = zip2.files[fileName].asText();
            content = content.replace(/#([A-Za-z0-9_.]+)#/g, '{$1}');
            zip2.file(fileName, content);
          }
        });
        
        const doc2 = new Docxtemplater(zip2, {
          paragraphLoop: true,
          linebreaks: true
        });
        
        console.log('✅ Template works with {} delimiters after conversion!');
      } catch (error2) {
        console.error('❌ Template also fails with {} delimiters');
      }
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Get template ID from command line
const templateId = process.argv[2];
if (!templateId) {
  console.error('Usage: node analyze-any-template.js <template-id>');
  process.exit(1);
}

analyzeTemplate(templateId);