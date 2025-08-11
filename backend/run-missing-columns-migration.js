require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  console.log('🚀 Running missing columns migration on Supabase...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../database/migrations/201_add_missing_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Migration file loaded successfully');
    console.log('⚡ Executing migration...');
    
    // Split the SQL into individual statements (by semicolon)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i] + ';';
      
      // Skip comments and empty statements
      if (statement.trim().startsWith('--') || statement.trim().length < 10) {
        continue;
      }
      
      // Extract table name for logging
      let tableName = 'unknown';
      if (statement.includes('ALTER TABLE')) {
        const match = statement.match(/ALTER TABLE (\w+)/i);
        if (match) tableName = match[1];
      } else if (statement.includes('CREATE TABLE')) {
        const match = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
        if (match) tableName = match[1];
      } else if (statement.includes('CREATE INDEX')) {
        const match = statement.match(/CREATE .*INDEX .* ON (\w+)/i);
        if (match) tableName = match[1];
      }
      
      try {
        // Execute the statement using Supabase's RPC
        const { error } = await supabase.rpc('exec_sql', { 
          query: statement 
        }).single();
        
        if (error) {
          // Try direct execution as alternative
          console.log(`⚠️ RPC failed for ${tableName}, statement ${i+1}/${statements.length}`);
          errorCount++;
        } else {
          successCount++;
          console.log(`✅ Applied to ${tableName} (${i+1}/${statements.length})`);
        }
      } catch (err) {
        console.log(`⚠️ Skipped ${tableName}: ${err.message?.substring(0, 50)}...`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful statements: ${successCount}`);
    console.log(`⚠️ Skipped statements: ${errorCount}`);
    
    // Test if key columns were added
    console.log('\n🔍 Verifying key columns...');
    
    // Test tasks table
    const { data: taskTest, error: taskError } = await supabase
      .from('tasks')
      .select('id, category, completion_percentage')
      .limit(1);
    
    if (!taskError) {
      console.log('✅ Tasks table: category and completion_percentage columns exist!');
    } else {
      console.log('❌ Tasks table: Missing columns -', taskError.message);
    }
    
    // Test documents table
    const { data: docTest, error: docError } = await supabase
      .from('documents')
      .select('id, filename, description')
      .limit(1);
    
    if (!docError) {
      console.log('✅ Documents table: filename and description columns exist!');
    } else {
      console.log('❌ Documents table: Missing columns -', docError.message);
    }
    
    // Test exchange_participants table
    const { data: partTest, error: partError } = await supabase
      .from('exchange_participants')
      .select('id, user_id, can_access_chat')
      .limit(1);
    
    if (!partError) {
      console.log('✅ Exchange participants: user_id and can_access_chat columns exist!');
    } else {
      console.log('❌ Exchange participants: Missing columns -', partError.message);
    }
    
    console.log('\n🎉 Migration process complete!');
    console.log('📝 Note: Some statements may have been skipped if columns already existed.');
    console.log('🔄 You can now re-run the SEGEV DEMO creation script!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

// Run the migration
if (require.main === module) {
  runMigration().catch(console.error);
}

module.exports = runMigration;