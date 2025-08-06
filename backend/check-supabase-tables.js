require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkSupabaseTables() {
  try {
    console.log('🔍 Checking Supabase tables...');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try to get table information
    const { data, error } = await supabase
      .rpc('get_table_names');
    
    if (error) {
      console.log('❌ Error getting tables:', error.message);
      console.log('🔍 Trying to list tables manually...');
      
      // Try common table names
      const tables = ['users', 'exchanges', 'contacts', 'tasks', 'messages', 'documents'];
      
      for (const table of tables) {
        try {
          const { data: testData, error: testError } = await supabase
            .from(table)
            .select('count')
            .limit(1);
          
          if (testError) {
            console.log(`❌ Table '${table}': ${testError.message}`);
          } else {
            console.log(`✅ Table '${table}' exists`);
          }
        } catch (e) {
          console.log(`❌ Table '${table}': ${e.message}`);
        }
      }
      return;
    }
    
    console.log('✅ Tables found:', data);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSupabaseTables(); 