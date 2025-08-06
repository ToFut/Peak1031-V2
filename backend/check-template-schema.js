require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkTemplateSchema() {
  console.log('🔍 Checking document_templates table schema...');
  
  try {
    // Get one row to see the columns
    const { data, error } = await supabase
      .from('document_templates')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Table columns:', Object.keys(data[0]));
      console.log('📊 Sample data:', data[0]);
    } else {
      console.log('⚠️ Table is empty, creating a test entry to see columns...');
      
      // Try to insert a test row
      const { data: testData, error: insertError } = await supabase
        .from('document_templates')
        .insert({
          name: 'Schema Test',
          description: 'Testing schema',
          category: 'test'
        })
        .select();
      
      if (insertError) {
        console.error('❌ Insert error:', insertError);
        console.log('📝 This error tells us what columns are expected/missing');
      } else if (testData) {
        console.log('✅ Test row created:', testData[0]);
        console.log('📊 Available columns:', Object.keys(testData[0]));
        
        // Clean up test row
        await supabase
          .from('document_templates')
          .delete()
          .eq('id', testData[0].id);
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkTemplateSchema();