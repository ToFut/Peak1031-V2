const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function runPinMigration() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  try {
    console.log('🔄 Adding default_document_pin column to users table...');
    
    // Try to add the column
    const { error } = await supabase.rpc('sql', {
      query: `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS default_document_pin VARCHAR(10);
        
        COMMENT ON COLUMN users.default_document_pin IS 'Default PIN for document protection (4-10 digits)';
      `
    });
    
    if (error) {
      console.log('❌ Migration error:', error);
      
      // Try alternative approach - check if column already exists
      const { data: tableInfo, error: infoError } = await supabase.rpc('sql', {
        query: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' 
          AND column_name = 'default_document_pin';
        `
      });
      
      if (!infoError && tableInfo && tableInfo.length > 0) {
        console.log('✅ Column already exists');
      } else {
        console.log('❌ Failed to add column:', error.message);
      }
    } else {
      console.log('✅ Migration completed successfully');
    }
    
    // Test that we can read from the users table
    const { data, error: testError } = await supabase
      .from('users')
      .select('id, email, default_document_pin')
      .limit(1);
    
    if (!testError) {
      console.log('✅ Users table accessible with new column');
      if (data.length > 0) {
        console.log('   Sample user:', data[0].email, 'PIN:', data[0].default_document_pin || '[not set]');
      }
    } else {
      console.log('❌ Error reading users table:', testError);
    }
    
  } catch (error) {
    console.error('❌ Script error:', error.message);
  }
}

runPinMigration();