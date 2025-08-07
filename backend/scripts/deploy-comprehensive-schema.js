const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Use service role key for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function deployComprehensiveSchema() {
  try {
    console.log('🚀 Starting comprehensive schema deployment...\n');

    // Read the comprehensive migration file
    const migrationPath = path.join(__dirname, '../database/migrations/200_comprehensive_optimized_schema.sql');
    
    let migrationSQL;
    try {
      migrationSQL = fs.readFileSync(migrationPath, 'utf8');
      console.log('✅ Migration file loaded successfully');
    } catch (err) {
      // Try alternative path
      const altPath = path.join(__dirname, '../../database/migrations/200_comprehensive_optimized_schema.sql');
      migrationSQL = fs.readFileSync(altPath, 'utf8');
      console.log('✅ Migration file loaded from alternative path');
    }

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && !stmt.startsWith('/*'));

    console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      try {
        // Skip comments and empty statements
        if (statement.trim() === ';' || statement.trim().startsWith('--')) {
          continue;
        }

        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        
        // Use rpc to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql_query: statement 
        });

        if (error) {
          // Some errors are expected (like "already exists")
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate_object') ||
              error.message.includes('relation already exists')) {
            console.log(`⚠️  Skipped (already exists): ${error.message.substring(0, 100)}...`);
          } else {
            console.log(`❌ Error in statement ${i + 1}: ${error.message}`);
            errorCount++;
          }
        } else {
          successCount++;
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (err) {
        console.log(`❌ Exception in statement ${i + 1}: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n📊 Deployment Summary:');
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📝 Total: ${statements.length}`);

    if (errorCount === 0) {
      console.log('\n🎉 Comprehensive schema deployed successfully!');
    } else {
      console.log(`\n⚠️  Deployment completed with ${errorCount} errors`);
    }

  } catch (error) {
    console.log('💥 Deployment failed:', error.message);
    process.exit(1);
  }
}

// Alternative approach - try to execute the SQL directly
async function deployDirectSQL() {
  try {
    console.log('🔄 Trying direct SQL execution...\n');

    // Read migration file
    const migrationPath = path.join(__dirname, '../database/migrations/200_comprehensive_optimized_schema.sql');
    
    let migrationSQL;
    try {
      migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    } catch (err) {
      const altPath = path.join(__dirname, '../../database/migrations/200_comprehensive_optimized_schema.sql');
      migrationSQL = fs.readFileSync(altPath, 'utf8');
    }

    console.log('✅ Migration file loaded');

    // Try to execute the entire migration
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSQL 
    });

    if (error) {
      console.log('❌ Direct execution failed:', error.message);
      console.log('🔄 Falling back to statement-by-statement execution...\n');
      await deployComprehensiveSchema();
    } else {
      console.log('🎉 Direct SQL execution successful!');
    }

  } catch (error) {
    console.log('💥 Direct execution failed:', error.message);
    console.log('🔄 Falling back to statement-by-statement execution...\n');
    await deployComprehensiveSchema();
  }
}

// Start deployment
deployDirectSQL();