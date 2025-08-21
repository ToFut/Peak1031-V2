const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../.env' });

async function fixLoginAuditsSchema() {
  console.log('🔧 Fixing login_audits table schema...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Add missing columns to login_audits table
    const sql = `
      ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS ip_changed BOOLEAN DEFAULT false;
      ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS previous_ip VARCHAR(45);
      ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;
      ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS risk_factors JSONB;
      ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'login';
      ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS location_data JSONB;
      ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);
    `;
    
    const { error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('❌ Error adding columns:', error);
      
      // Try alternative approach - execute each statement separately
      console.log('🔄 Trying alternative approach...');
      
      const statements = [
        'ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS ip_changed BOOLEAN DEFAULT false;',
        'ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS previous_ip VARCHAR(45);',
        'ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;',
        'ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS risk_factors JSONB;',
        'ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT \'login\';',
        'ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS location_data JSONB;',
        'ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);'
      ];
      
      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('exec_sql', { sql: statement });
        if (stmtError) {
          console.error(`❌ Error executing: ${statement}`, stmtError);
        } else {
          console.log(`✅ Executed: ${statement}`);
        }
      }
    } else {
      console.log('✅ Successfully added missing columns to login_audits table');
    }
    
    // Verify the table structure
    console.log('🔍 Verifying table structure...');
    const { data: columns, error: verifyError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_name', 'login_audits')
      .eq('table_schema', 'public')
      .order('ordinal_position');
    
    if (verifyError) {
      console.error('❌ Error verifying table structure:', verifyError);
    } else {
      console.log('📋 Current login_audits columns:');
      columns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixLoginAuditsSchema().then(() => {
  console.log('✅ Schema fix completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});


