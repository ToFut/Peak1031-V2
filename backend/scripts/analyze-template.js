const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const AdmZip = require('adm-zip');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function downloadAndAnalyze() {
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
  
  // Extract and analyze header1.xml
  const headerEntry = zip.getEntry('word/header1.xml');
  if (headerEntry) {
    const content = headerEntry.getData().toString('utf8');
    console.log('\n📄 Header1.xml content:\n');
    console.log('='.repeat(80));
    console.log(content);
    console.log('='.repeat(80));
    
    // Look for placeholder patterns
    console.log('\n🔍 Searching for placeholder patterns...');
    
    // Find all occurrences of single # characters
    const singleHashMatches = content.match(/#(?![^<>]*#)/g);
    if (singleHashMatches) {
      console.log('\n⚠️  Found single # characters (potential unclosed tags):');
      singleHashMatches.forEach((match, i) => {
        const index = content.indexOf(match);
        const context = content.substring(Math.max(0, index - 50), Math.min(content.length, index + 50));
        console.log(`\n${i + 1}. Context around position ${index}:`);
        console.log('   ...', context.replace(/\n/g, ' '), '...');
      });
    }
    
    // Find all properly formed placeholders
    const placeholderMatches = content.match(/#[^#]+#/g);
    if (placeholderMatches) {
      console.log('\n✅ Found properly formed placeholders:');
      placeholderMatches.forEach((ph, i) => {
        console.log(`   ${i + 1}. ${ph}`);
      });
    }
    
    // Save the header for manual inspection
    await fs.writeFile('header1-original.xml', content);
    console.log('\n💾 Saved header1.xml to header1-original.xml for inspection');
  }
  
  // List all files in the docx
  console.log('\n📁 All files in the DOCX:');
  zip.getEntries().forEach(entry => {
    if (!entry.isDirectory) {
      console.log('   -', entry.entryName);
    }
  });
}

downloadAndAnalyze().catch(console.error);