require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function runMigration() {
  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    console.log('🔧 Running audit social migration...');
    
    // Read the migration file
    const migrationPath = '../database/migrations/040-create-audit-interactions.sql';
    const migration = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Migration file loaded');
    
    // Split the migration into individual statements
    const statements = migration
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📊 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`\n🔨 Executing statement ${i + 1}/${statements.length}:`);
        console.log(statement.substring(0, 100) + '...');
        
        try {
          const { data, error } = await supabase.rpc('execute_safe_query', {
            query_text: statement
          });
          
          if (error) {
            console.log(`⚠️ Statement ${i + 1} failed:`, error.message);
            // Continue with other statements
          } else {
            console.log(`✅ Statement ${i + 1} executed successfully`);
          }
        } catch (err) {
          console.log(`❌ Statement ${i + 1} error:`, err.message);
        }
      }
    }
    
    console.log('\n🎉 Migration completed!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration();
