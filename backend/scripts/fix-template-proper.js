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

async function fixTemplate() {
  console.log('📥 Downloading template from Supabase...');
  
  const filePath = 'templates/REV11-Settlement-Statement-1754440802203.docx';
  
  const { data, error } = await supabase.storage
    .from('documents')
    .download(filePath);
  
  if (error) {
    console.error('❌ Error downloading template:', error);
    throw error;
  }
  
  const buffer = Buffer.from(await data.arrayBuffer());
  const zip = new AdmZip(buffer);
  
  // Fix the header1.xml file
  const headerEntry = zip.getEntry('word/header1.xml');
  if (headerEntry) {
    let content = headerEntry.getData().toString('utf8');
    
    console.log('🔍 Original problematic section:');
    const problemMatch = content.match(/Exchange #: E-#[^<]*#/);
    if (problemMatch) {
      console.log('   Found:', problemMatch[0]);
    }
    
    // Fix the specific issue: E-#Matter.Number# should be E-#Matter.Number#
    // The problem is that there's a missing # after "E-"
    content = content.replace(
      '<w:t>Exchange #: E-#</w:t></w:r><w:proofErr w:type="spellStart"/><w:r w:rsidRPr="00F743E0"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/></w:rPr><w:t>Matter.Number</w:t></w:r><w:proofErr w:type="spellEnd"/><w:r w:rsidRPr="00F743E0"><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/></w:rPr><w:t>#</w:t>',
      '<w:t>Exchange #: E-#Matter.Number#</w:t>'
    );
    
    console.log('✅ Fixed the unclosed tag issue');
    
    // Update the zip with the fixed content
    zip.updateFile(headerEntry, Buffer.from(content, 'utf8'));
    
    // Save for verification
    await fs.writeFile('header1-fixed.xml', content);
    console.log('💾 Saved fixed header to header1-fixed.xml');
  }
  
  // Save the fixed DOCX
  const fixedBuffer = zip.toBuffer();
  await fs.writeFile('template-fixed.docx', fixedBuffer);
  console.log('💾 Saved fixed template to template-fixed.docx');
  
  // Test the fixed template
  console.log('\n🧪 Testing fixed template...');
  try {
    const zip = new PizZip(fixedBuffer);
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
      'Matter.Number': 'SEGEV-DEMO-2025-001',
      'Exchange.Number': 'SEGEV-DEMO-2025-001',
      'Exchange.Name': 'Segev Bin Exchange Demo 1',
      'Client.Name': 'Segev Bin'
    };
    
    doc.setData(testData);
    doc.render();
    
    console.log('✅ Template is now valid and can be rendered!');
    
    // Upload the fixed template
    console.log('\n📤 Uploading fixed template to Supabase...');
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .update(filePath, fixedBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        upsert: true
      });
    
    if (uploadError) {
      console.error('❌ Error uploading fixed template:', uploadError);
      throw uploadError;
    }
    
    console.log('✅ Fixed template uploaded successfully!');
    console.log('\n🎉 Template has been successfully fixed and uploaded!');
    
  } catch (error) {
    console.error('❌ Template validation error:', error);
    if (error.properties && error.properties.errors) {
      error.properties.errors.forEach((err, index) => {
        console.log(`\nError ${index + 1}:`);
        console.log('  Message:', err.message);
        console.log('  File:', err.properties.file);
        console.log('  Context:', err.properties.context);
      });
    }
  }
}

fixTemplate().catch(console.error);