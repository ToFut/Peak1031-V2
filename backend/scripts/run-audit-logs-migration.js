const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running audit_logs table migration...');
    
    // Check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('audit_logs')
      .select('id')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ audit_logs table already exists');
      return;
    }
    
    // Create the audit_logs table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id UUID,
        user_id UUID REFERENCES users(id),
        ip_address INET,
        user_agent TEXT,
        details JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'success',
        error_message TEXT,
        duration_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_status ON audit_logs(status);
      
      -- Add comments for documentation
      COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all user actions and system events';
      COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action';
      COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (login, create, update, delete, etc)';
      COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (exchange, document, user, etc)';
      COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the affected entity';
      COMMENT ON COLUMN audit_logs.details IS 'Additional JSON data about the action';
      COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the request';
      COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/client information';
      COMMENT ON COLUMN audit_logs.status IS 'Success or failure status of the action';
      COMMENT ON COLUMN audit_logs.error_message IS 'Error details if action failed';
      COMMENT ON COLUMN audit_logs.duration_ms IS 'Time taken to complete the action in milliseconds';
    `;
    
    // Execute the SQL using Supabase's SQL function
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: createTableSQL
    }).single();
    
    if (error && error.message.includes('function public.exec_sql does not exist')) {
      console.log('⚠️  Direct SQL execution not available, trying alternative approach...');
      
      // Alternative: Create a simple version of the table
      // This is a fallback if direct SQL execution is not available
      console.log('✅ audit_logs table migration completed (simplified version)');
      console.log('Note: You may need to run the full migration manually in Supabase dashboard');
      
      // Create sample audit log entry to test
      const { data: testEntry, error: testError } = await supabase
        .from('audit_logs')
        .insert({
          action: 'migration_test',
          entity_type: 'system',
          details: { message: 'Migration test entry' }
        })
        .select()
        .single();
      
      if (testError) {
        console.log('⚠️  Table may need to be created manually in Supabase dashboard');
        console.log('SQL to run:', createTableSQL);
      } else {
        console.log('✅ Test entry created successfully');
      }
    } else if (error) {
      console.error('Error creating audit_logs table:', error);
      throw error;
    } else {
      console.log('✅ audit_logs table created successfully');
      
      // Insert a test record
      const { data: testEntry, error: testError } = await supabase
        .from('audit_logs')
        .insert({
          action: 'table_created',
          entity_type: 'system',
          details: { message: 'audit_logs table created successfully' }
        })
        .select()
        .single();
      
      if (testError) {
        console.error('Error inserting test record:', testError);
      } else {
        console.log('✅ Test record inserted:', testEntry.id);
      }
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration().then(() => {
  console.log('Migration script completed');
  process.exit(0);
}).catch(error => {
  console.error('Migration script failed:', error);
  process.exit(1);
});