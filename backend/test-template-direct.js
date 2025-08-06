const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testDirectSupabase() {
  try {
    console.log('🔍 Testing direct Supabase query for templates...');
    
    const { data: templates, error } = await supabase
      .from('document_templates')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Supabase error:', error);
    } else {
      console.log('✅ Templates fetched successfully:', templates?.length || 0, 'templates');
      if (templates && templates.length > 0) {
        console.log('📄 First template:', templates[0]);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDirectSupabase();