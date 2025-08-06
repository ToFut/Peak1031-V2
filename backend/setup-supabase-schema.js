const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupSupabaseSchema() {
  try {
    console.log('🚀 Setting up Supabase schema...');
    
    // Read the complete schema SQL file
    const schemaPath = path.join(__dirname, '../database/COMPLETE_SCHEMA_NEW_SUPABASE.sql');
    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('📋 Executing schema...');
    
    // Execute the schema
    const { data, error } = await supabase.rpc('exec_sql', { sql: schemaSQL });
    
    if (error) {
      console.error('❌ Error executing schema:', error);
      
      // If exec_sql doesn't exist, try direct query
      console.log('🔄 Trying direct query execution...');
      
      // Split the SQL into individual statements and execute them
      const statements = schemaSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        try {
          const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
          if (stmtError) {
            console.log(`⚠️  Statement failed (continuing): ${stmtError.message}`);
          }
        } catch (e) {
          console.log(`⚠️  Statement failed (continuing): ${e.message}`);
        }
      }
    } else {
      console.log('✅ Schema executed successfully');
    }
    
    // Verify the setup by checking for key tables
    console.log('🔍 Verifying schema setup...');
    
    const tables = ['organizations', 'users', 'agencies', 'third_parties', 'contacts', 'exchanges', 'tasks', 'documents', 'messages', 'notifications'];
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: Ready`);
        }
      } catch (e) {
        console.log(`❌ Table ${table}: ${e.message}`);
      }
    }
    
    console.log('🎉 Supabase schema setup complete!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

setupSupabaseSchema(); 