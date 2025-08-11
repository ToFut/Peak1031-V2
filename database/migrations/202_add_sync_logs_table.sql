-- =================================================================
-- SYNC LOGS TABLE FOR PRACTICEPANTHER INTEGRATION TRACKING
-- Comprehensive sync monitoring and error tracking
-- =================================================================

-- Create sync_log_type enum
DO $$ BEGIN
    CREATE TYPE sync_log_type_enum AS ENUM (
        'full_sync', 
        'incremental_sync', 
        'contacts_sync', 
        'matters_sync', 
        'tasks_sync', 
        'users_sync',
        'invoices_sync',
        'manual_sync',
        'scheduled_sync',
        'webhook_sync'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create sync_status enum
DO $$ BEGIN
    CREATE TYPE sync_status_enum AS ENUM (
        'started', 
        'in_progress', 
        'completed', 
        'failed', 
        'partial_success', 
        'cancelled',
        'timeout'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =================================================================
-- SYNC_LOGS TABLE
-- =================================================================
CREATE TABLE IF NOT EXISTS sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Sync Identity & Type
    sync_type sync_log_type_enum NOT NULL,
    sync_source VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'manual', 'webhook', 'api'
    triggered_by UUID REFERENCES users(id), -- User who triggered sync (if manual)
    
    -- Sync Execution Details
    status sync_status_enum DEFAULT 'started',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER GENERATED ALWAYS AS (
        CASE 
            WHEN completed_at IS NULL THEN NULL
            ELSE EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER
        END
    ) STORED,
    
    -- Data Processing Statistics
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    
    -- Entity-Specific Counts
    contacts_synced INTEGER DEFAULT 0,
    matters_synced INTEGER DEFAULT 0,
    tasks_synced INTEGER DEFAULT 0,
    users_synced INTEGER DEFAULT 0,
    invoices_synced INTEGER DEFAULT 0,
    
    -- PP API Usage Tracking
    api_calls_made INTEGER DEFAULT 0,
    api_rate_limit_hits INTEGER DEFAULT 0,
    api_errors INTEGER DEFAULT 0,
    
    -- Token & Authentication
    pp_token_used VARCHAR(100), -- First 100 chars of token for identification
    pp_token_expires_at TIMESTAMP WITH TIME ZONE,
    token_refreshed BOOLEAN DEFAULT false,
    
    -- Error Tracking
    error_message TEXT,
    error_details JSONB DEFAULT '{}',
    failed_entities JSONB DEFAULT '[]', -- Array of entities that failed
    
    -- Sync Configuration
    sync_config JSONB DEFAULT '{}', -- Sync parameters used
    filters_applied JSONB DEFAULT '{}', -- Any filters or date ranges
    
    -- Data Quality & Validation
    validation_warnings JSONB DEFAULT '[]',
    data_quality_score INTEGER CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
    duplicate_records_found INTEGER DEFAULT 0,
    
    -- Performance Metrics
    memory_usage_mb INTEGER,
    peak_memory_mb INTEGER,
    network_bytes_sent BIGINT DEFAULT 0,
    network_bytes_received BIGINT DEFAULT 0,
    
    -- Incremental Sync Tracking
    last_sync_timestamp TIMESTAMP WITH TIME ZONE, -- For incremental syncs
    sync_cursor VARCHAR(255), -- PP cursor for pagination
    is_incremental BOOLEAN DEFAULT false,
    
    -- Metadata & Context
    server_info JSONB DEFAULT '{}', -- Server details where sync ran
    pp_api_version VARCHAR(20),
    sync_version VARCHAR(20) DEFAULT '1.0.0',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- SYNC LOG DETAILS TABLE (Individual Entity Sync Records)
-- =================================================================
CREATE TABLE IF NOT EXISTS sync_log_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Parent Sync Reference
    sync_log_id UUID NOT NULL REFERENCES sync_logs(id) ON DELETE CASCADE,
    
    -- Entity Information
    entity_type VARCHAR(50) NOT NULL, -- 'contact', 'matter', 'task', 'user', 'invoice'
    entity_action VARCHAR(20) NOT NULL, -- 'create', 'update', 'skip', 'error'
    
    -- PP Entity Details
    pp_entity_id VARCHAR(36) NOT NULL,
    pp_entity_data JSONB DEFAULT '{}', -- Full PP entity data
    
    -- Local Entity Details  
    local_entity_id UUID,
    local_entity_table VARCHAR(50),
    
    -- Processing Results
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    validation_errors JSONB DEFAULT '[]',
    
    -- Field-Level Changes
    fields_changed TEXT[] DEFAULT '{}',
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    
    -- Data Quality
    data_quality_issues JSONB DEFAULT '[]',
    requires_manual_review BOOLEAN DEFAULT false,
    
    -- Performance
    processing_time_ms INTEGER,
    
    -- Timestamps
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =================================================================
-- PERFORMANCE INDEXES
-- =================================================================

-- Sync Logs Indexes
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON sync_logs(status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_type_date ON sync_logs(sync_type, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_triggered_by ON sync_logs(triggered_by) WHERE triggered_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sync_logs_duration ON sync_logs(duration_seconds DESC) WHERE duration_seconds IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sync_logs_errors ON sync_logs(status) WHERE status IN ('failed', 'partial_success');

-- Sync Log Details Indexes
CREATE INDEX IF NOT EXISTS idx_sync_details_log ON sync_log_details(sync_log_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_sync_details_pp_entity ON sync_log_details(entity_type, pp_entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_details_local_entity ON sync_log_details(local_entity_table, local_entity_id);
CREATE INDEX IF NOT EXISTS idx_sync_details_errors ON sync_log_details(success) WHERE success = false;
CREATE INDEX IF NOT EXISTS idx_sync_details_manual_review ON sync_log_details(requires_manual_review) WHERE requires_manual_review = true;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_recent_by_type ON sync_logs(sync_type, started_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_sync_details_entity_success ON sync_log_details(entity_type, success, processed_at DESC);

-- JSONB indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_sync_logs_error_details ON sync_logs USING GIN(error_details);
CREATE INDEX IF NOT EXISTS idx_sync_logs_failed_entities ON sync_logs USING GIN(failed_entities);
CREATE INDEX IF NOT EXISTS idx_sync_details_pp_data ON sync_log_details USING GIN(pp_entity_data);
CREATE INDEX IF NOT EXISTS idx_sync_details_validation_errors ON sync_log_details USING GIN(validation_errors);

-- =================================================================
-- SYNC MONITORING VIEWS (Optional - for easier querying)
-- =================================================================

-- Recent sync summary view
CREATE OR REPLACE VIEW sync_summary AS
SELECT 
    sync_type,
    status,
    COUNT(*) as sync_count,
    AVG(duration_seconds) as avg_duration_seconds,
    SUM(records_processed) as total_records_processed,
    SUM(records_created) as total_records_created,
    SUM(records_updated) as total_records_updated,
    SUM(records_failed) as total_records_failed,
    MAX(started_at) as last_sync_at
FROM sync_logs 
WHERE started_at > NOW() - INTERVAL '30 days'
GROUP BY sync_type, status
ORDER BY sync_type, status;

-- Error summary view
CREATE OR REPLACE VIEW sync_errors AS
SELECT 
    sl.id,
    sl.sync_type,
    sl.started_at,
    sl.error_message,
    sl.records_failed,
    COUNT(sld.id) as failed_entities_count
FROM sync_logs sl
LEFT JOIN sync_log_details sld ON sl.id = sld.sync_log_id AND sld.success = false
WHERE sl.status IN ('failed', 'partial_success')
GROUP BY sl.id, sl.sync_type, sl.started_at, sl.error_message, sl.records_failed
ORDER BY sl.started_at DESC;

-- =================================================================
-- SUCCESS MESSAGE
-- =================================================================

/*
✅ SYNC_LOGS TABLE CREATED SUCCESSFULLY!

Features Added:
- Comprehensive sync execution tracking
- Detailed entity-level sync logging  
- Performance and error monitoring
- Token usage and API rate limit tracking
- Data quality metrics
- Incremental sync support
- Memory and network usage monitoring

Database Objects Created:
- sync_logs table (main sync execution log)
- sync_log_details table (individual entity processing)
- 2 custom enums (sync_log_type_enum, sync_status_enum)
- 10+ performance indexes
- 2 monitoring views (sync_summary, sync_errors)

Ready for PracticePanther sync monitoring! 🚀
*/