require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testFetchTemplates() {
  console.log('📋 Fetching templates directly from Supabase...');
  
  try {
    const { data: templates, error } = await supabase
      .from('document_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`✅ Found ${templates.length} templates:`);
    templates.forEach(template => {
      console.log(`\n📄 Template: ${template.name}`);
      console.log(`   Category: ${template.category}`);
      console.log(`   Description: ${template.description}`);
      console.log(`   File URL: ${template.file_template || 'No file'}`);
      console.log(`   Created: ${template.created_at}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFetchTemplates();