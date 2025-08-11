const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkDocumentsSchema() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  try {
    console.log('🔍 Checking documents table schema...');
    
    // Get a sample document to see the actual schema
    const { data: documents, error } = await supabase
      .from('documents')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('❌ Error reading documents table:', error);
    } else {
      console.log('✅ Documents table accessible');
      if (documents.length > 0) {
        console.log('\n📋 Available columns in documents table:');
        Object.keys(documents[0]).forEach((key, index) => {
          console.log(`   ${index + 1}. ${key}: ${typeof documents[0][key]}`);
        });
        
        // Check for the specific columns we need
        const requiredColumns = ['description', 'pin_required', 'pin_hash', 'original_filename', 'file_size', 'mime_type'];
        console.log('\n🔍 Checking required columns:');
        requiredColumns.forEach(col => {
          const exists = documents[0].hasOwnProperty(col);
          console.log(`   ${exists ? '✅' : '❌'} ${col}`);
        });
      } else {
        console.log('   No documents found, checking table structure differently...');
        
        // Try to check specific columns by selecting them
        const columnsToCheck = ['id', 'original_filename', 'file_size', 'mime_type', 'pin_required', 'pin_hash', 'description'];
        for (const col of columnsToCheck) {
          try {
            const { data, error } = await supabase
              .from('documents')
              .select(col)
              .limit(1);
            console.log(`   ${error ? '❌' : '✅'} ${col}${error ? ' - ' + error.message : ''}`);
          } catch (e) {
            console.log(`   ❌ ${col} - ${e.message}`);
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

checkDocumentsSchema();