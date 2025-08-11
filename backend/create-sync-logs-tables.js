const supabaseService = require('./services/supabase');

async function createSyncLogsTables() {
  console.log('📋 Creating sync_logs tables...');
  
  try {
    // Create sync_logs table
    const createSyncLogsTable = `
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
    `;
    
    console.log('🔨 Creating sync_logs table...');
    const { error: syncLogsError } = await supabaseService.client.rpc('execute_safe_query', { query: createSyncLogsTable });
    
    if (syncLogsError && !syncLogsError.message.includes('already exists')) {
      console.error('❌ Error creating sync_logs:', syncLogsError);
    } else {
      console.log('✅ sync_logs table ready');
    }
    
    // Create sync_log_details table
    const createSyncDetailsTable = `
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
    `;
    
    console.log('🔨 Creating sync_log_details table...');
    const { error: syncDetailsError } = await supabaseService.client.rpc('execute_safe_query', { query: createSyncDetailsTable });
    
    if (syncDetailsError && !syncDetailsError.message.includes('already exists')) {
      console.error('❌ Error creating sync_log_details:', syncDetailsError);
    } else {
      console.log('✅ sync_log_details table ready');
    }
    
    // Create indexes
    console.log('🔧 Creating performance indexes...');
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status, started_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_sync_logs_type_date ON sync_logs(sync_type, started_at DESC);',
      'CREATE INDEX IF NOT EXISTS idx_sync_details_log ON sync_log_details(sync_log_id, entity_type);',
      'CREATE INDEX IF NOT EXISTS idx_sync_details_pp_entity ON sync_log_details(entity_type, pp_entity_id);'
    ];
    
    for (const indexSQL of createIndexes) {
      const { error: indexError } = await supabaseService.client.rpc('execute_safe_query', { query: indexSQL });
      if (indexError && !indexError.message.includes('already exists')) {
        console.log('⚠️ Index creation issue:', indexError.message);
      }
    }
    
    console.log('✅ Performance indexes created');
    
    // Verify tables were created
    const { data: syncLogs, error: verifyError } = await supabaseService.client
      .from('sync_logs')
      .select('id')
      .limit(1);
    
    if (verifyError) {
      console.log('⚠️ Could not verify sync_logs table:', verifyError.message);
    } else {
      console.log('📊 sync_logs table verified successfully');
    }
    
    const { data: syncDetails, error: verifyDetailsError } = await supabaseService.client
      .from('sync_log_details')
      .select('id')
      .limit(1);
    
    if (verifyDetailsError) {
      console.log('⚠️ Could not verify sync_log_details table:', verifyDetailsError.message);
    } else {
      console.log('📊 sync_log_details table verified successfully');
    }
    
    console.log('\n🎉 Sync logging system is ready!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
if (require.main === module) {
  createSyncLogsTables().catch(console.error);
}

module.exports = createSyncLogsTables;