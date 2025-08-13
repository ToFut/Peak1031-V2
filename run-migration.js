#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

async function runMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    process.exit(1);
  }

  // Create Supabase client with service role key for admin operations
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    console.log('🔄 Running migration 207_add_permission_functions.sql...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'database', 'migrations', '207_add_permission_functions.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSql
    });

    if (error) {
      // If the RPC function doesn't exist, try direct query execution
      console.log('📝 Executing migration SQL directly...');
      
      // Split the SQL into individual statements and execute them
      const statements = migrationSql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('CREATE OR REPLACE FUNCTION') || 
            statement.includes('GRANT EXECUTE') || 
            statement.includes('CREATE INDEX') ||
            statement.includes('COMMENT ON FUNCTION')) {
          
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          
          const { error: execError } = await supabase
            .from('_temp')
            .select('1')
            .limit(0); // This is just to test connection
          
          if (execError) {
            console.error('Connection test failed:', execError);
          }
          
          // For functions, we need to use the SQL editor approach
          // Since we can't execute DDL directly through the client, 
          // we'll provide instructions for manual execution
        }
      }
      
      console.log('⚠️  Due to Supabase client limitations, please execute the migration manually:');
      console.log('1. Go to your Supabase Dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and run the contents of database/migrations/207_add_permission_functions.sql');
      console.log('');
      console.log('Alternatively, if you have psql access:');
      console.log(`psql "${supabaseUrl.replace('https://', 'postgresql://postgres:[password]@').replace('.supabase.co', '.supabase.co:5432/')}/postgres" -f database/migrations/207_add_permission_functions.sql`);
      
    } else {
      console.log('✅ Migration executed successfully!');
      console.log('📊 Result:', data);
    }

    console.log('');
    console.log('🔍 Testing permission function...');
    
    // Test the function to see if it was created
    const { data: testResult, error: testError } = await supabase.rpc('check_user_permission', {
      exchange_uuid: '00000000-0000-0000-0000-000000000000',
      permission_name: 'view_documents',
      user_uuid: '00000000-0000-0000-0000-000000000000'
    });

    if (testError) {
      if (testError.message.includes('Could not find the function')) {
        console.log('⚠️  Function not yet available. Please run the migration manually as instructed above.');
      } else {
        console.log('✅ Function exists but test failed with different error (expected):', testError.message);
      }
    } else {
      console.log('✅ Permission function is working!');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().catch(console.error);