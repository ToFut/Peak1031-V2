#!/usr/bin/env node

// Load environment variables
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

async function runMigration() {
  console.log('🚀 Starting Supabase Schema Migration');
  console.log('=====================================');

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY');
    process.exit(1);
  }

  console.log('📡 Connecting to Supabase...');
  console.log('URL:', supabaseUrl.slice(0, 30) + '...');
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test connection first
    console.log('🔌 Testing connection...');
    const { data: testData, error: testError } = await supabase
      .from('pg_tables')
      .select('tablename')
      .eq('schemaname', 'public')
      .limit(1);

    if (testError) {
      throw new Error(`Connection test failed: ${testError.message}`);
    }

    console.log('✅ Connection successful!');
    console.log('📊 Current tables:', testData?.length || 0);

    // Read the comprehensive schema
    const schemaPath = path.join(__dirname, '../../database/migrations/200_comprehensive_optimized_schema_fixed.sql');
    console.log('📖 Reading schema from:', schemaPath);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    console.log('📄 Schema file size:', (schemaSQL.length / 1024).toFixed(1) + 'KB');

    // Split the SQL into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('/*') && !stmt.startsWith('--'));

    console.log('📝 Found', statements.length, 'SQL statements');

    // Execute statements in batches
    let successCount = 0;
    let errorCount = 0;

    console.log('⚡ Executing schema statements...');
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      try {
        // Skip comments and empty statements
        if (statement.startsWith('/*') || statement.startsWith('--') || statement.trim() === '') {
          continue;
        }

        console.log(`[${i + 1}/${statements.length}] Executing: ${statement.slice(0, 50)}...`);
        
        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          // Some errors are expected (like "already exists")
          if (error.message.includes('already exists') || error.message.includes('duplicate')) {
            console.log(`⚠️  Warning: ${error.message}`);
          } else {
            console.error(`❌ Error in statement ${i + 1}:`, error.message);
            errorCount++;
          }
        } else {
          successCount++;
        }

        // Small delay between statements
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        console.error(`❌ Exception in statement ${i + 1}:`, err.message);
        errorCount++;
      }
    }

    console.log('=====================================');
    console.log('📊 Migration Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    // Test final state
    console.log('🧪 Testing final database state...');
    
    const tables = ['users', 'contacts', 'exchanges', 'tasks', 'documents', 'exchange_participants'];
    const tableResults = {};

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          tableResults[table] = `Error: ${error.message}`;
        } else {
          tableResults[table] = `✅ ${count || 0} records`;
        }
      } catch (err) {
        tableResults[table] = `❌ ${err.message}`;
      }
    }

    console.log('📋 Table Status:');
    Object.entries(tableResults).forEach(([table, status]) => {
      console.log(`  ${table}: ${status}`);
    });

    console.log('=====================================');
    console.log('🎉 Migration process completed!');
    
    if (errorCount === 0) {
      console.log('🚀 Database is ready for use!');
    } else {
      console.log('⚠️  Some errors occurred. Please check the logs above.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Create exec_sql function first if it doesn't exist
async function createExecFunction() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        EXECUTE sql;
    END;
    $$;
  `;

  try {
    const { error } = await supabase.rpc('exec', { sql: createFunctionSQL });
    if (error && !error.message.includes('already exists')) {
      console.log('Note: Could not create exec_sql function:', error.message);
    }
  } catch (err) {
    console.log('Note: Could not create exec_sql function, will use alternative approach');
  }
}

// Run the migration
if (require.main === module) {
  createExecFunction().then(() => {
    runMigration();
  });
}

module.exports = { runMigration };