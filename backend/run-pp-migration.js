const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config();

async function runPPMigration() {
  console.log('🔄 Running PP data tables migration...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  try {
    const migrationSQL = fs.readFileSync('../database/migrations/008_create_pp_data_tables.sql', 'utf8');
    
    console.log('📊 Creating PP data tables...');
    
    // Split migration into individual commands
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    console.log(`Executing ${commands.length} SQL commands...`);
    
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      if (command.length > 10) { // Skip very short commands
        try {
          console.log(`Executing command ${i + 1}/${commands.length}...`);
          await supabase.rpc('exec_sql', { sql: command });
        } catch (error) {
          console.log(`⚠️ Command ${i + 1} warning:`, error.message);
        }
      }
    }
    
    console.log('✅ PP data tables migration completed!');
    console.log('📋 Tables: pp_contacts, pp_tasks, pp_invoices, pp_expenses, pp_users, pp_notes, pp_matters');
    
    // Verify tables were created
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .like('table_name', 'pp_%');
      
    if (!error && tables) {
      console.log(`✅ Verified ${tables.length} PP tables created:`, tables.map(t => t.table_name).join(', '));
    }
    
  } catch (error) {
    console.error('❌ Migration error:', error.message);
  }
}

runPPMigration();