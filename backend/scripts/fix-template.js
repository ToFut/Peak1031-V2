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

async function downloadTemplate() {
  console.log('📥 Downloading template from Supabase...');
  
  const filePath = 'templates/REV11-Settlement-Statement-1754440802203.docx';
  
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);
  
  if (error) {
    console.error('❌ Error downloading template:', error);
    throw error;
  }
  
  console.log('✅ Template downloaded successfully');
  
  // Save to local file for inspection
  const buffer = Buffer.from(await data.arrayBuffer());
  await fs.writeFile('template-original.docx', buffer);
  console.log('💾 Saved original template to template-original.docx');
  
  return buffer;
}

async function analyzeTemplate(buffer) {
  console.log('\n🔍 Analyzing template for issues...');
  
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
  } catch (error) {
    if (error.properties && error.properties.errors) {
      console.log('❌ Template errors found:');
      error.properties.errors.forEach((err, index) => {
        console.log(`\nError ${index + 1}:`);
        console.log('  Type:', err.name);
        console.log('  Message:', err.message);
        console.log('  File:', err.properties.file);
        console.log('  Context:', err.properties.context);
        console.log('  Explanation:', err.properties.explanation);
      });
      return error.properties.errors;
    }
    throw error;
  }
}

async function fixTemplate(buffer) {
  console.log('\n🔧 Attempting to fix template...');
  
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  
  // Find and fix the problematic header file
  entries.forEach(entry => {
    if (entry.entryName === 'word/header1.xml') {
      console.log('📄 Found header1.xml, checking content...');
      let content = entry.getData().toString('utf8');
      
      // Look for unclosed tags with # delimiter
      const tagPattern = /#[^#]*$/gm;
      const matches = content.match(tagPattern);
      
      if (matches) {
        console.log('🔍 Found unclosed tags:', matches);
        
        // Fix unclosed tags by closing them
        matches.forEach(match => {
          const fixedTag = match + '#';
          content = content.replace(match, fixedTag);
          console.log(`✅ Fixed: "${match}" -> "${fixedTag}"`);
        });
        
        // Update the entry with fixed content
        zip.updateFile(entry, Buffer.from(content, 'utf8'));
        console.log('✅ Updated header1.xml with fixes');
      }
    }
  });
  
  // Save fixed template
  const fixedBuffer = zip.toBuffer();
  await fs.writeFile('template-fixed.docx', fixedBuffer);
  console.log('💾 Saved fixed template to template-fixed.docx');
  
  return fixedBuffer;
}

async function testFixedTemplate(buffer) {
  console.log('\n🧪 Testing fixed template...');
  
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
    
    // Test with sample data
    const testData = {
      'Exchange.Number': 'TEST-001',
      'Exchange.Name': 'Test Exchange',
      'Client.Name': 'Test Client'
    };
    
    doc.setData(testData);
    doc.render();
    
    console.log('✅ Template is now valid and can be rendered!');
    return true;
  } catch (error) {
    console.error('❌ Template still has errors:', error);
    return false;
  }
}

async function uploadFixedTemplate(buffer) {
  console.log('\n📤 Uploading fixed template to Supabase...');
  
  const filePath = 'templates/REV11-Settlement-Statement-1754440802203.docx';
  
  const { error } = await supabase.storage
    .from('documents')
    .update(filePath, buffer, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true
    });
  
  if (error) {
    console.error('❌ Error uploading fixed template:', error);
    throw error;
  }
  
  console.log('✅ Fixed template uploaded successfully!');
}

async function main() {
  try {
    // Download the template
    const originalBuffer = await downloadTemplate();
    
    // Analyze issues
    const errors = await analyzeTemplate(originalBuffer);
    
    // Fix the template
    const fixedBuffer = await fixTemplate(originalBuffer);
    
    // Test the fixed template
    const isFixed = await testFixedTemplate(fixedBuffer);
    
    if (isFixed) {
      // Upload the fixed template
      await uploadFixedTemplate(fixedBuffer);
      console.log('\n🎉 Template has been successfully fixed and uploaded!');
    } else {
      console.log('\n⚠️  Template could not be automatically fixed. Manual intervention required.');
    }
    
  } catch (error) {
    console.error('❌ Script error:', error);
    process.exit(1);
  }
}

main();