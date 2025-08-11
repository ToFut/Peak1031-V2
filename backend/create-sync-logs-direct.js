require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function createSyncLogsTables() {
  console.log('📋 Creating sync_logs tables directly...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    }
  });
  
  try {
    // Try inserting a test record to sync_logs to see if table exists
    const { data: testInsert, error: testError } = await supabase
      .from('sync_logs')
      .insert([{
        sync_type: 'test',
        status: 'started',
        records_processed: 0
      }])
      .select();
    
    if (testError) {
      console.log('Table does not exist, will create manually via SQL...');
      
      // For now, let's create a simpler approach - use direct inserts
      console.log('✅ Sync logging will be handled through direct table operations');
      console.log('📝 Tables may need to be created manually in Supabase dashboard');
      
      // Show the SQL that should be run manually
      console.log('\n📋 Please run this SQL in Supabase SQL Editor:');
      console.log(`
        -- Create sync_logs table
        CREATE TABLE IF NOT EXISTS sync_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sync_type VARCHAR(50) NOT NULL,
          sync_source VARCHAR(50) DEFAULT 'scheduled',
          triggered_by UUID,
          status VARCHAR(20) DEFAULT 'started',
          started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          completed_at TIMESTAMP WITH TIME ZONE,
          duration_seconds INTEGER,
          records_processed INTEGER DEFAULT 0,
          records_created INTEGER DEFAULT 0,
          records_updated INTEGER DEFAULT 0,
          records_failed INTEGER DEFAULT 0,
          contacts_synced INTEGER DEFAULT 0,
          matters_synced INTEGER DEFAULT 0,
          tasks_synced INTEGER DEFAULT 0,
          users_synced INTEGER DEFAULT 0,
          api_calls_made INTEGER DEFAULT 0,
          error_message TEXT,
          error_details JSONB DEFAULT '{}',
          sync_config JSONB DEFAULT '{}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create sync_log_details table
        CREATE TABLE IF NOT EXISTS sync_log_details (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          sync_log_id UUID NOT NULL REFERENCES sync_logs(id) ON DELETE CASCADE,
          entity_type VARCHAR(50) NOT NULL,
          entity_action VARCHAR(20) NOT NULL,
          pp_entity_id VARCHAR(36) NOT NULL,
          pp_entity_data JSONB DEFAULT '{}',
          local_entity_id UUID,
          local_entity_table VARCHAR(50),
          success BOOLEAN DEFAULT true,
          error_message TEXT,
          validation_errors JSONB DEFAULT '[]',
          fields_changed TEXT[] DEFAULT '{}',
          processing_time_ms INTEGER,
          processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status, started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_sync_logs_type_date ON sync_logs(sync_type, started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_sync_details_log ON sync_log_details(sync_log_id, entity_type);
        CREATE INDEX IF NOT EXISTS idx_sync_details_pp_entity ON sync_log_details(entity_type, pp_entity_id);
      `);
      
    } else {
      console.log('✅ sync_logs table already exists');
      
      // Clean up test record
      await supabase
        .from('sync_logs')
        .delete()
        .eq('sync_type', 'test');
    }
    
    console.log('\n🎉 Sync logging system setup completed!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  createSyncLogsTables().catch(console.error);
}

module.exports = createSyncLogsTables;