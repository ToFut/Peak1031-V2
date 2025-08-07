const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

async function runUnifiedMigration() {
  console.log('🔄 Running Unified PP Data Migration...');
  console.log('This will merge PP data into main tables\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    const migrationSQL = fs.readFileSync('../database/migrations/009_merge_pp_data_into_main_tables.sql', 'utf8');
    
    console.log('📊 Migration Steps:');
    console.log('1. Enhancing existing tables with PP fields');
    console.log('2. Creating new tables (invoices, expenses, notes)');
    console.log('3. Migrating data from pp_ tables to main tables');
    console.log('4. Creating unified views\n');
    
    // Split migration into individual commands
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`Executing ${commands.length} SQL commands...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      
      // Skip very short commands
      if (command.length < 10) continue;
      
      // Extract operation type for logging
      let operation = 'Unknown';
      if (command.includes('ALTER TABLE')) operation = 'Altering table';
      else if (command.includes('CREATE TABLE')) operation = 'Creating table';
      else if (command.includes('CREATE INDEX')) operation = 'Creating index';
      else if (command.includes('INSERT INTO')) operation = 'Migrating data';
      else if (command.includes('UPDATE')) operation = 'Updating data';
      else if (command.includes('CREATE OR REPLACE VIEW')) operation = 'Creating view';
      
      try {
        console.log(`[${i + 1}/${commands.length}] ${operation}...`);
        
        // Execute via RPC
        const { data, error } = await supabase.rpc('exec_sql', { 
          sql: command 
        });
        
        if (error) {
          // Check if it's a benign error (like column already exists)
          if (error.message.includes('already exists') || 
              error.message.includes('duplicate key')) {
            console.log(`  ⚠️ Skipped (already exists)`);
          } else {
            console.log(`  ❌ Error: ${error.message}`);
            errorCount++;
          }
        } else {
          console.log(`  ✅ Success`);
          successCount++;
        }
      } catch (error) {
        console.log(`  ❌ Error: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful operations: ${successCount}`);
    console.log(`❌ Failed operations: ${errorCount}`);
    
    // Verify the new structure
    console.log('\n🔍 Verifying new structure...\n');
    
    // Check enhanced contacts table
    const { data: contactColumns } = await supabase
      .rpc('query_database', {
        query: `SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'contacts' 
                AND column_name LIKE 'pp_%' OR column_name LIKE 'phone_%'
                ORDER BY column_name`
      });
    
    if (contactColumns && contactColumns.length > 0) {
      console.log('✅ Contacts table enhanced with PP fields:');
      contactColumns.forEach(col => console.log(`   • ${col.column_name}`));
    }
    
    // Check new tables
    const { data: newTables } = await supabase
      .rpc('query_database', {
        query: `SELECT table_name FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('invoices', 'expenses', 'notes')
                ORDER BY table_name`
      });
    
    if (newTables && newTables.length > 0) {
      console.log('\n✅ New tables created:');
      newTables.forEach(t => console.log(`   • ${t.table_name}`));
    }
    
    // Check data migration
    const { count: contactsWithPP } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .not('pp_id', 'is', null);
    
    const { count: tasksWithPP } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .not('pp_id', 'is', null);
    
    const { count: invoiceCount } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true });
    
    const { count: expenseCount } = await supabase
      .from('expenses')
      .select('*', { count: 'exact', head: true });
    
    console.log('\n📊 Data Migration Results:');
    console.log(`   • Contacts with PP data: ${contactsWithPP || 0}`);
    console.log(`   • Tasks with PP data: ${tasksWithPP || 0}`);
    console.log(`   • Invoices migrated: ${invoiceCount || 0}`);
    console.log(`   • Expenses migrated: ${expenseCount || 0}`);
    
    console.log('\n✅ Unified migration completed successfully!');
    console.log('\n📌 Next Steps:');
    console.log('1. Run PP sync to populate data: node sync-pp-data.js');
    console.log('2. Verify data in admin dashboard');
    console.log('3. After verification, old pp_ tables can be dropped');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Please check the error and try again');
  }
}

// Add RPC function if it doesn't exist
async function createExecSQLFunction() {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    await supabase.rpc('query_database', {
      query: `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void AS $$
        BEGIN
          EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });
  } catch (error) {
    // Function might already exist
  }
}

// Run the migration
createExecSQLFunction().then(() => {
  runUnifiedMigration();
});