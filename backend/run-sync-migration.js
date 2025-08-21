/**
 * Run sync_logs table migration
 * This creates the missing table needed for PP sync logging
 */

require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runSyncMigration() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
    );
    
    console.log('🔧 Running sync_logs migration...');
    console.log('=================================');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/060-create-sync-logs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration SQL loaded from:', migrationPath);
    
    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`🔄 Executing ${statements.length} SQL statements...`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      try {
        console.log(`  ${i + 1}/${statements.length}: Executing statement...`);
        
        // Use rpc to execute raw SQL
        const { data, error } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });
        
        if (error) {
          console.error(`  ❌ Error in statement ${i + 1}:`, error.message);
          
          // Try alternative method for this statement
          if (statement.includes('CREATE TABLE')) {
            console.log('  🔄 Trying alternative table creation...');
            // We'll handle this manually in Supabase dashboard
          }
        } else {
          console.log(`  ✅ Statement ${i + 1} executed successfully`);
        }
      } catch (statementError) {
        console.error(`  ❌ Exception in statement ${i + 1}:`, statementError.message);
      }
    }
    
    // Test the table
    console.log('\n🔄 Testing sync_logs table...');
    const { data: testData, error: testError } = await supabase
      .from('sync_logs')
      .select('id')
      .limit(1);
      
    if (testError) {
      console.error('❌ Table test failed:', testError.message);
      console.log('\n📝 MANUAL STEPS REQUIRED:');
      console.log('1. Open your Supabase dashboard');
      console.log('2. Go to SQL Editor');
      console.log('3. Copy and paste this SQL:');
      console.log('\n' + migrationSQL);
      console.log('\n4. Click "Run" to execute');
    } else {
      console.log('✅ sync_logs table is working correctly!');
      
      // Insert a test record
      const { data: insertData, error: insertError } = await supabase
        .from('sync_logs')
        .insert({
          sync_type: 'migration_test',
          status: 'success',
          records_processed: 1,
          triggered_by: 'migration_script'
        })
        .select()
        .single();
        
      if (insertError) {
        console.error('❌ Insert test failed:', insertError);
      } else {
        console.log('✅ Test record inserted:', insertData.id);
        
        // Clean up test record
        await supabase.from('sync_logs').delete().eq('id', insertData.id);
        console.log('✅ Test record cleaned up');
      }
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  runSyncMigration();
}

module.exports = { runSyncMigration };
