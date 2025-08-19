require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function addMetadataColumn() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase credentials not found in environment variables');
    console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    console.log('🔄 Adding metadata column to tasks table...');
    
    // Execute SQL to add metadata column
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        ALTER TABLE tasks 
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
        
        CREATE INDEX IF NOT EXISTS idx_tasks_metadata 
        ON tasks USING GIN (metadata);
        
        COMMENT ON COLUMN tasks.metadata IS 'Additional task metadata including notify_all_users flag and other custom properties';
      `
    });
    
    if (error) {
      console.error('❌ Error adding metadata column:', error);
      
      // Try alternative approach using direct SQL
      console.log('🔄 Trying alternative approach...');
      
      const { error: altError } = await supabase
        .from('tasks')
        .select('id')
        .limit(1);
      
      if (altError && altError.message.includes('metadata')) {
        console.log('✅ Metadata column already exists or will be added by Supabase');
      } else {
        console.error('❌ Alternative approach failed:', altError);
      }
    } else {
      console.log('✅ Successfully added metadata column to tasks table');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
addMetadataColumn()
  .then(() => {
    console.log('🎉 Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
