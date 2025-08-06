-- =====================================================
-- Peak 1031 Exchange Management System - Complete Supabase Setup
-- =====================================================
-- This script creates the complete database schema for Peak 1031
-- Compatible with PracticePanther integration and all business features
-- 
-- Instructions:
-- 1. Copy this entire script
-- 2. Go to Supabase Dashboard → SQL Editor
-- 3. Paste and run this script
-- 4. Verify all tables are created successfully

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- =====================================================
-- 1. PEOPLE TABLE (Unified contacts & users)
-- =====================================================
CREATE TABLE people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Info
    email VARCHAR(255), -- Unique when not null
    password_hash VARCHAR(255), -- Null for contacts-only
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    company VARCHAR(255),
    
    -- Address
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(50),
    address_zip_code VARCHAR(20),
    address_country VARCHAR(100) DEFAULT 'US',
    
    -- Authentication & Roles
    role VARCHAR(50), -- admin, coordinator, client, third_party, agency
    is_user BOOLEAN DEFAULT false, -- Can login?
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    two_fa_enabled BOOLEAN DEFAULT false,
    two_fa_secret VARCHAR(255),
    last_login TIMESTAMP,
    
    -- PracticePanther Integration
    pp_contact_id VARCHAR(255), -- PP contact ID
    pp_data JSONB DEFAULT '{}', -- Raw PP data
    source VARCHAR(50) DEFAULT 'manual', -- 'practice_partner', 'manual'
    last_sync_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(email),
    UNIQUE(pp_contact_id)
);

-- =====================================================
-- 2. EXCHANGES TABLE (1031 Exchange transactions)
-- =====================================================
CREATE TABLE exchanges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    exchange_name VARCHAR(255), -- Alternate name
    description TEXT,
    exchange_number VARCHAR(50), -- Auto-generated
    
    -- Relationships
    client_id UUID REFERENCES people(id), -- The client
    coordinator_id UUID REFERENCES people(id), -- Assigned coordinator
    
    -- Status & Priority
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, 45D, 180D, COMPLETED, TERMINATED, ON_HOLD
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    exchange_type VARCHAR(50) DEFAULT '1031_exchange',
    
    -- Property Information
    property_sold_address TEXT,
    property_sold_value DECIMAL(15,2),
    property_bought_address TEXT,
    property_bought_value DECIMAL(15,2),
    exchange_value DECIMAL(15,2),
    
    -- Important Dates
    start_date DATE,
    completion_date DATE,
    forty_five_day_deadline DATE,
    one_eighty_day_deadline DATE,
    
    -- System Fields
    is_active BOOLEAN DEFAULT true,
    
    -- PracticePanther Integration
    pp_matter_id VARCHAR(255), -- PP matter ID
    pp_data JSONB DEFAULT '{}', -- Raw PP data
    last_sync_at TIMESTAMP,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(pp_matter_id)
);

-- =====================================================
-- 3. EXCHANGE_PARTICIPANTS TABLE (Access control)
-- =====================================================
CREATE TABLE exchange_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- client, coordinator, attorney, qi, title_company, accountant
    permissions JSONB DEFAULT '{}', -- Specific permissions
    can_chat BOOLEAN DEFAULT true,
    can_upload BOOLEAN DEFAULT true,
    can_view_documents BOOLEAN DEFAULT true,
    can_sign_documents BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Unique constraint
    UNIQUE(exchange_id, person_id)
);

-- =====================================================
-- COMMUNICATION SYSTEM
-- =====================================================

-- =====================================================
-- 4. CHAT_ROOMS TABLE (Multiple rooms per exchange)
-- =====================================================
CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL, -- "General", "Document Review", "Coordinator Only"
    description TEXT,
    room_type VARCHAR(50) DEFAULT 'general', -- general, private, coordinator_only, client_only
    is_private BOOLEAN DEFAULT false,
    participants JSONB DEFAULT '[]', -- Array of person IDs
    created_by UUID REFERENCES people(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 5. MESSAGES TABLE (Enhanced messaging)
-- =====================================================
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    chat_room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES people(id),
    
    -- Message Content
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- text, file, system, alert, reaction
    
    -- Threading
    thread_id UUID REFERENCES messages(id), -- For threaded conversations
    reply_to_id UUID REFERENCES messages(id), -- Direct reply
    
    -- Attachments & Media
    attachments JSONB DEFAULT '[]', -- Array of file references
    reactions JSONB DEFAULT '{}', -- Emoji reactions {emoji: [person_ids]}
    
    -- Metadata
    is_edited BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 6. MESSAGE_READS TABLE (Read receipts)
-- =====================================================
CREATE TABLE message_reads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    read_at TIMESTAMP DEFAULT NOW(),
    delivered_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(message_id, person_id)
);

-- =====================================================
-- TASK MANAGEMENT SYSTEM
-- =====================================================

-- =====================================================
-- 7. TASK_TEMPLATES TABLE (Predefined task templates)
-- =====================================================
CREATE TABLE task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- "45-Day", "180-Day", "Documentation", "Legal"
    default_title VARCHAR(255),
    default_description TEXT,
    default_priority VARCHAR(20) DEFAULT 'MEDIUM',
    default_due_days INTEGER, -- Days from exchange start
    role_required VARCHAR(50), -- Which role should be assigned
    is_required BOOLEAN DEFAULT false, -- Must be completed for exchange
    auto_create BOOLEAN DEFAULT false, -- Auto-create when exchange starts
    checklist JSONB DEFAULT '[]', -- Array of checklist items
    dependencies JSONB DEFAULT '[]', -- Array of prerequisite template IDs
    created_by UUID REFERENCES people(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 8. TASKS TABLE (Individual tasks)
-- =====================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    template_id UUID REFERENCES task_templates(id), -- Null for manual tasks
    
    -- Task Details
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD
    
    -- Assignment
    assigned_to UUID REFERENCES people(id),
    created_by UUID REFERENCES people(id),
    
    -- Dates
    due_date DATE,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Task Features
    checklist JSONB DEFAULT '[]', -- Array of checklist items with completion status
    dependencies JSONB DEFAULT '[]', -- Array of task IDs that must be completed first
    auto_created BOOLEAN DEFAULT false, -- Was auto-created from template
    
    -- PracticePanther Integration
    pp_task_id VARCHAR(255), -- PP task ID
    pp_data JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(pp_task_id)
);

-- =====================================================
-- 9. TASK_COMMENTS TABLE (Task discussions)
-- =====================================================
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    author_id UUID REFERENCES people(id),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 10. TASK_HISTORY TABLE (Audit trail for tasks)
-- =====================================================
CREATE TABLE task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- created, updated, assigned, completed, etc.
    field_name VARCHAR(100), -- Which field changed
    old_value TEXT,
    new_value TEXT,
    changed_by UUID REFERENCES people(id),
    changed_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- DOCUMENT MANAGEMENT SYSTEM
-- =====================================================

-- =====================================================
-- 11. DOCUMENT_TEMPLATES TABLE (Document templates)
-- =====================================================
CREATE TABLE document_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100), -- "Agreements", "Tax Forms", "Property Deeds"
    file_template TEXT, -- Template file path or URL
    required_fields JSONB DEFAULT '[]', -- Array of required field definitions
    is_required BOOLEAN DEFAULT false, -- Required for all exchanges
    role_access JSONB DEFAULT '[]', -- Which roles can access this template
    auto_generate BOOLEAN DEFAULT false, -- Auto-generate from exchange data
    created_by UUID REFERENCES people(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 12. DOCUMENTS TABLE (File storage metadata)
-- =====================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    template_id UUID REFERENCES document_templates(id), -- Null for ad-hoc uploads
    
    -- File Information
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500), -- Storage path
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100),
    file_url TEXT, -- Full storage URL (Supabase Storage)
    
    -- Categorization
    category VARCHAR(100), -- "Contract", "Tax Document", "Property Info"
    tags JSONB DEFAULT '[]', -- Array of tags for search
    
    -- Access Control
    pin_required BOOLEAN DEFAULT false,
    pin_hash VARCHAR(255), -- Encrypted PIN for sensitive docs
    access_log JSONB DEFAULT '[]', -- Who accessed when
    is_public BOOLEAN DEFAULT false, -- Public to all exchange participants
    
    -- Document Status
    is_signed BOOLEAN DEFAULT false,
    signature_required BOOLEAN DEFAULT false,
    approval_status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected
    
    -- User Info
    uploaded_by UUID REFERENCES people(id),
    approved_by UUID REFERENCES people(id),
    
    -- PracticePanther Integration
    pp_document_id VARCHAR(255),
    pp_matter_id VARCHAR(255),
    
    -- Storage Provider
    storage_provider VARCHAR(50) DEFAULT 'supabase', -- supabase, s3, etc.
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(pp_document_id)
);

-- =====================================================
-- 13. DOCUMENT_VERSIONS TABLE (Version control)
-- =====================================================
CREATE TABLE document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    uploaded_by UUID REFERENCES people(id),
    version_notes TEXT,
    is_current BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(document_id, version_number)
);

-- =====================================================
-- 14. DOCUMENT_SIGNATURES TABLE (E-signatures)
-- =====================================================
CREATE TABLE document_signatures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    signer_id UUID REFERENCES people(id),
    signature_data TEXT, -- Base64 signature image or digital signature
    signed_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    signature_method VARCHAR(50) DEFAULT 'digital', -- digital, wet_scan, esign_service
    
    UNIQUE(document_id, signer_id)
);

-- =====================================================
-- NOTIFICATIONS & ALERTS
-- =====================================================

-- =====================================================
-- 15. ALERTS TABLE (Personal notifications)
-- =====================================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id) ON DELETE CASCADE,
    
    -- Alert Content
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    alert_type VARCHAR(50) DEFAULT 'info', -- info, warning, error, success, reminder
    
    -- Behavior
    priority VARCHAR(20) DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    read BOOLEAN DEFAULT false,
    dismissed BOOLEAN DEFAULT false,
    auto_dismiss BOOLEAN DEFAULT false, -- Auto-dismiss after period
    dismiss_after INTERVAL DEFAULT '7 days',
    
    -- Related Data
    related_entity_type VARCHAR(50), -- exchange, task, document, message
    related_entity_id UUID,
    data JSONB DEFAULT '{}', -- Additional alert data
    
    -- Delivery
    email_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    read_at TIMESTAMP,
    dismissed_at TIMESTAMP
);

-- =====================================================
-- 16. SYSTEM_ALERTS TABLE (System-wide alerts)
-- =====================================================
CREATE TABLE system_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Alert Details
    alert_type VARCHAR(50) NOT NULL, -- maintenance, outage, sync_failure, security
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
    
    -- Scope
    affected_users JSONB DEFAULT '[]', -- Array of person IDs, empty = all users
    affected_exchanges JSONB DEFAULT '[]', -- Array of exchange IDs
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    resolved BOOLEAN DEFAULT false,
    resolved_by UUID REFERENCES people(id),
    resolved_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- ADMIN & CONFIGURATION
-- =====================================================

-- =====================================================
-- 17. EMAIL_TEMPLATES TABLE (Email automation)
-- =====================================================
CREATE TABLE email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Email Content
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    body_text TEXT,
    
    -- Template Variables
    variables JSONB DEFAULT '[]', -- Array of available variables
    
    -- Triggers
    trigger_event VARCHAR(100), -- exchange_created, task_due, document_uploaded
    trigger_conditions JSONB DEFAULT '{}', -- Conditions for sending
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    send_delay INTERVAL DEFAULT '0 minutes', -- Delay before sending
    
    -- User Info
    created_by UUID REFERENCES people(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 18. ADMIN_SETTINGS TABLE (System configuration)
-- =====================================================
CREATE TABLE admin_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(255) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_type VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
    category VARCHAR(100), -- system, business_rules, integrations, ui
    description TEXT,
    is_public BOOLEAN DEFAULT false, -- Can non-admins read this?
    is_system BOOLEAN DEFAULT false, -- System setting (cannot be deleted)
    updated_by UUID REFERENCES people(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 19. REPORT_TEMPLATES TABLE (Custom reports)
-- =====================================================
CREATE TABLE report_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Report Definition
    query_sql TEXT NOT NULL, -- The SQL query to run
    parameters JSONB DEFAULT '[]', -- Array of parameter definitions
    output_format VARCHAR(50) DEFAULT 'table', -- table, chart, pdf
    chart_config JSONB DEFAULT '{}', -- Chart configuration if applicable
    
    -- Access Control
    is_public BOOLEAN DEFAULT false,
    allowed_roles JSONB DEFAULT '[]', -- Array of roles that can run this report
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    cache_duration INTERVAL DEFAULT '1 hour',
    
    -- User Info
    created_by UUID REFERENCES people(id),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- AUDIT & INTEGRATION
-- =====================================================

-- =====================================================
-- 20. AUDIT_LOGS TABLE (Complete audit trail)
-- =====================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    person_id UUID REFERENCES people(id), -- Who performed the action
    
    -- Action Details
    action VARCHAR(100) NOT NULL, -- created, updated, deleted, viewed, downloaded
    entity_type VARCHAR(50) NOT NULL, -- people, exchanges, tasks, documents, etc.
    entity_id UUID, -- ID of the affected entity
    
    -- Change Details
    old_values JSONB DEFAULT '{}', -- Previous values
    new_values JSONB DEFAULT '{}', -- New values
    changes JSONB DEFAULT '{}', -- Summary of what changed
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(255),
    request_id VARCHAR(255), -- For tracing requests
    
    -- Additional Details
    details JSONB DEFAULT '{}', -- Additional context
    
    -- Timestamp
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 21. PRACTICE_PARTNER_SYNCS TABLE (PP integration tracking)
-- =====================================================
CREATE TABLE practice_partner_syncs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Sync Details
    sync_id VARCHAR(255) UNIQUE NOT NULL, -- Unique sync identifier
    sync_type VARCHAR(50) NOT NULL, -- contacts, matters, tasks, documents, full
    status VARCHAR(20) DEFAULT 'pending', -- pending, running, completed, failed, partial
    
    -- Timing
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    duration_seconds INTEGER,
    
    -- Statistics
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_skipped INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    
    -- Data
    statistics JSONB DEFAULT '{}', -- Detailed statistics
    errors JSONB DEFAULT '[]', -- Array of errors encountered
    config JSONB DEFAULT '{}', -- Sync configuration used
    
    -- Incremental Sync
    last_sync_cursor VARCHAR(255), -- For pagination/incremental sync
    filters_applied JSONB DEFAULT '{}', -- What filters were used
    
    -- User Info
    created_by UUID REFERENCES people(id),
    triggered_by VARCHAR(50) DEFAULT 'manual', -- manual, scheduled, webhook
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 22. OAUTH_TOKENS TABLE (OAuth integration tokens)
-- =====================================================
CREATE TABLE oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL, -- practicepanther, google, etc.
    
    -- Token Data
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    expires_at TIMESTAMP,
    scope TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    
    -- User Association
    created_by UUID REFERENCES people(id),
    
    -- Metadata
    provider_data JSONB DEFAULT '{}', -- Additional provider-specific data
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- People indexes
CREATE INDEX idx_people_email ON people(email);
CREATE INDEX idx_people_role ON people(role);
CREATE INDEX idx_people_is_user ON people(is_user);
CREATE INDEX idx_people_pp_contact_id ON people(pp_contact_id);
CREATE INDEX idx_people_source ON people(source);
CREATE INDEX idx_people_last_sync ON people(last_sync_at);

-- Exchanges indexes
CREATE INDEX idx_exchanges_status ON exchanges(status);
CREATE INDEX idx_exchanges_priority ON exchanges(priority);
CREATE INDEX idx_exchanges_client_id ON exchanges(client_id);
CREATE INDEX idx_exchanges_coordinator_id ON exchanges(coordinator_id);
CREATE INDEX idx_exchanges_pp_matter_id ON exchanges(pp_matter_id);
CREATE INDEX idx_exchanges_start_date ON exchanges(start_date);
CREATE INDEX idx_exchanges_is_active ON exchanges(is_active);

-- Exchange participants indexes
CREATE INDEX idx_exchange_participants_exchange_id ON exchange_participants(exchange_id);
CREATE INDEX idx_exchange_participants_person_id ON exchange_participants(person_id);
CREATE INDEX idx_exchange_participants_role ON exchange_participants(role);

-- Chat & Messages indexes
CREATE INDEX idx_chat_rooms_exchange_id ON chat_rooms(exchange_id);
CREATE INDEX idx_messages_exchange_id ON messages(exchange_id);
CREATE INDEX idx_messages_chat_room_id ON messages(chat_room_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_message_reads_message_id ON message_reads(message_id);
CREATE INDEX idx_message_reads_person_id ON message_reads(person_id);

-- Tasks indexes
CREATE INDEX idx_tasks_exchange_id ON tasks(exchange_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_pp_task_id ON tasks(pp_task_id);
CREATE INDEX idx_task_templates_category ON task_templates(category);
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_history_task_id ON task_history(task_id);

-- Documents indexes
CREATE INDEX idx_documents_exchange_id ON documents(exchange_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_created_at ON documents(created_at);
CREATE INDEX idx_documents_pp_document_id ON documents(pp_document_id);
CREATE INDEX idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX idx_document_signatures_document_id ON document_signatures(document_id);

-- Alerts indexes
CREATE INDEX idx_alerts_person_id ON alerts(person_id);
CREATE INDEX idx_alerts_read ON alerts(read);
CREATE INDEX idx_alerts_alert_type ON alerts(alert_type);
CREATE INDEX idx_alerts_created_at ON alerts(created_at);
CREATE INDEX idx_system_alerts_is_active ON system_alerts(is_active);

-- Admin indexes
CREATE INDEX idx_email_templates_trigger_event ON email_templates(trigger_event);
CREATE INDEX idx_admin_settings_category ON admin_settings(category);

-- Audit indexes
CREATE INDEX idx_audit_logs_person_id ON audit_logs(person_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Integration indexes
CREATE INDEX idx_practice_partner_syncs_status ON practice_partner_syncs(status);
CREATE INDEX idx_practice_partner_syncs_sync_type ON practice_partner_syncs(sync_type);
CREATE INDEX idx_practice_partner_syncs_start_time ON practice_partner_syncs(start_time);
CREATE INDEX idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX idx_oauth_tokens_is_active ON oauth_tokens(is_active);

-- =====================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- =====================================================

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables with updated_at
CREATE TRIGGER update_people_updated_at 
    BEFORE UPDATE ON people 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchanges_updated_at 
    BEFORE UPDATE ON exchanges 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchange_participants_updated_at 
    BEFORE UPDATE ON exchange_participants 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_rooms_updated_at 
    BEFORE UPDATE ON chat_rooms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at 
    BEFORE UPDATE ON messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_templates_updated_at 
    BEFORE UPDATE ON task_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_comments_updated_at 
    BEFORE UPDATE ON task_comments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_templates_updated_at 
    BEFORE UPDATE ON document_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
    BEFORE UPDATE ON email_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at 
    BEFORE UPDATE ON admin_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at 
    BEFORE UPDATE ON report_templates 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_practice_partner_syncs_updated_at 
    BEFORE UPDATE ON practice_partner_syncs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_oauth_tokens_updated_at 
    BEFORE UPDATE ON oauth_tokens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_alerts_updated_at 
    BEFORE UPDATE ON system_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- =====================================================

-- Enable RLS on all main tables
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- BASIC RLS POLICIES
-- =====================================================

-- People policies
CREATE POLICY "Users can view own profile" ON people
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON people
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Admins can view all people
CREATE POLICY "Admins can view all people" ON people
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM people p 
            WHERE p.id::text = auth.uid()::text 
            AND p.role = 'admin'
        )
    );

-- Exchange policies
CREATE POLICY "Users can view accessible exchanges" ON exchanges
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM people p 
            WHERE p.id::text = auth.uid()::text 
            AND (
                p.role IN ('admin', 'coordinator') OR 
                coordinator_id = p.id OR
                client_id = p.id OR
                EXISTS (
                    SELECT 1 FROM exchange_participants ep 
                    WHERE ep.exchange_id = exchanges.id 
                    AND ep.person_id = p.id
                )
            )
        )
    );

-- Message policies
CREATE POLICY "Users can view accessible messages" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exchanges e
            JOIN people p ON p.id::text = auth.uid()::text
            WHERE e.id = messages.exchange_id
            AND (
                p.role IN ('admin', 'coordinator') OR 
                e.coordinator_id = p.id OR
                e.client_id = p.id OR
                EXISTS (
                    SELECT 1 FROM exchange_participants ep 
                    WHERE ep.exchange_id = e.id 
                    AND ep.person_id = p.id
                    AND ep.can_chat = true
                )
            )
        )
    );

-- Task policies  
CREATE POLICY "Users can view accessible tasks" ON tasks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exchanges e
            JOIN people p ON p.id::text = auth.uid()::text
            WHERE e.id = tasks.exchange_id
            AND (
                p.role IN ('admin', 'coordinator') OR 
                e.coordinator_id = p.id OR
                e.client_id = p.id OR
                tasks.assigned_to = p.id OR
                EXISTS (
                    SELECT 1 FROM exchange_participants ep 
                    WHERE ep.exchange_id = e.id 
                    AND ep.person_id = p.id
                )
            )
        )
    );

-- Document policies
CREATE POLICY "Users can view accessible documents" ON documents
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM exchanges e
            JOIN people p ON p.id::text = auth.uid()::text
            WHERE e.id = documents.exchange_id
            AND (
                p.role IN ('admin', 'coordinator') OR 
                e.coordinator_id = p.id OR
                e.client_id = p.id OR
                documents.uploaded_by = p.id OR
                (documents.is_public = true AND EXISTS (
                    SELECT 1 FROM exchange_participants ep 
                    WHERE ep.exchange_id = e.id 
                    AND ep.person_id = p.id
                    AND ep.can_view_documents = true
                ))
            )
        )
    );

-- Alert policies
CREATE POLICY "Users can view own alerts" ON alerts
    FOR SELECT USING (auth.uid()::text = person_id::text);

CREATE POLICY "Users can update own alerts" ON alerts
    FOR UPDATE USING (auth.uid()::text = person_id::text);

-- =====================================================
-- INITIAL DATA SETUP
-- =====================================================

-- Create default task templates
INSERT INTO task_templates (name, description, category, default_title, default_description, default_priority, default_due_days, role_required, is_required, auto_create) VALUES
('45-Day Property Identification', 'Identify replacement properties within 45 days', '45-Day', 'Identify Replacement Properties', 'Client must identify potential replacement properties within 45 days of sale', 'HIGH', 45, 'client', true, true),
('180-Day Purchase Completion', 'Complete purchase of replacement property within 180 days', '180-Day', 'Complete Property Purchase', 'Finalize purchase of replacement property to complete 1031 exchange', 'HIGH', 180, 'client', true, true),
('Exchange Agreement Signing', 'Sign the 1031 Exchange Agreement', 'Documentation', 'Sign Exchange Agreement', 'Review and sign the 1031 Exchange Agreement with QI', 'HIGH', 7, 'client', true, true),
('Property Listing Creation', 'Create property listing for sale', 'Marketing', 'Create Property Listing', 'Work with realtor to create comprehensive property listing', 'MEDIUM', 14, 'coordinator', false, false),
('Title Search & Insurance', 'Obtain title search and insurance for new property', 'Legal', 'Title Search & Insurance', 'Coordinate title search and obtain title insurance for replacement property', 'MEDIUM', 30, 'coordinator', true, false);

-- Create default document templates
INSERT INTO document_templates (name, description, category, is_required, role_access, is_active) VALUES
('1031 Exchange Agreement', 'Primary exchange agreement with QI', 'Agreements', true, '["client", "coordinator", "admin"]', true),
('Property Sale Contract', 'Contract for sale of relinquished property', 'Contracts', true, '["client", "coordinator", "admin"]', true),
('Property Purchase Contract', 'Contract for purchase of replacement property', 'Contracts', true, '["client", "coordinator", "admin"]', true),
('45-Day Property List', 'List of identified replacement properties', 'Identification', true, '["client", "coordinator", "admin"]', true),
('Form 8824', 'IRS Form 8824 for Like-Kind Exchanges', 'Tax Forms', true, '["client", "coordinator", "admin"]', true);

-- Create default email templates
INSERT INTO email_templates (name, subject, body_html, body_text, trigger_event, is_active) VALUES
('Exchange Welcome', 'Welcome to Your 1031 Exchange - {{exchange_name}}', 
'<h2>Welcome to Peak 1031!</h2><p>Your 1031 exchange "{{exchange_name}}" has been created successfully.</p><p>Your coordinator {{coordinator_name}} will be in touch soon.</p>', 
'Welcome to Peak 1031! Your 1031 exchange "{{exchange_name}}" has been created successfully. Your coordinator {{coordinator_name}} will be in touch soon.', 
'exchange_created', true),

('Task Due Reminder', 'Task Due Soon: {{task_title}}', 
'<h3>Task Reminder</h3><p>Your task "{{task_title}}" is due on {{due_date}}.</p><p>Exchange: {{exchange_name}}</p><p><a href="{{task_url}}">View Task</a></p>', 
'Task Reminder: Your task "{{task_title}}" is due on {{due_date}}. Exchange: {{exchange_name}}. View at: {{task_url}}', 
'task_due_reminder', true),

('Document Upload Notification', 'New Document: {{document_name}}', 
'<h3>Document Uploaded</h3><p>A new document "{{document_name}}" has been uploaded to your exchange.</p><p>Exchange: {{exchange_name}}</p><p><a href="{{document_url}}">View Document</a></p>', 
'New document "{{document_name}}" uploaded to exchange "{{exchange_name}}". View at: {{document_url}}', 
'document_uploaded', true);

-- Create default admin settings
INSERT INTO admin_settings (setting_key, setting_value, setting_type, category, description, is_public, is_system) VALUES
('system.company_name', 'Peak 1031', 'string', 'system', 'Company name displayed in UI', true, true),
('system.timezone', 'America/New_York', 'string', 'system', 'Default system timezone', true, true),
('business.default_45_day_buffer', '2', 'number', 'business_rules', 'Buffer days before 45-day deadline warnings', false, false),
('business.default_180_day_buffer', '7', 'number', 'business_rules', 'Buffer days before 180-day deadline warnings', false, false),
('integration.pp_sync_enabled', 'true', 'boolean', 'integrations', 'Enable PracticePanther synchronization', false, false),
('integration.pp_sync_interval', '15', 'number', 'integrations', 'PP sync interval in minutes', false, false),
('ui.default_items_per_page', '25', 'number', 'ui', 'Default pagination size', true, false),
('ui.enable_dark_mode', 'true', 'boolean', 'ui', 'Allow users to switch to dark mode', true, false);

-- Create system admin user (CHANGE PASSWORD IMMEDIATELY!)
INSERT INTO people (email, password_hash, first_name, last_name, role, is_user, is_active, email_verified) 
VALUES (
    'admin@peak1031.com', 
    crypt('ChangeMe123!', gen_salt('bf')), 
    'System', 
    'Administrator', 
    'admin', 
    true, 
    true, 
    true
);

-- =====================================================
-- VERIFICATION & COMPLETION
-- =====================================================

-- Verify table creation
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- Success message
SELECT 'Peak 1031 Exchange Management System database setup completed successfully!' as status;

-- =====================================================
-- NEXT STEPS
-- =====================================================

/*

🎉 DATABASE SETUP COMPLETE!

NEXT STEPS:

1. AUTHENTICATION SETUP:
   - Go to Supabase Dashboard → Authentication
   - Configure email templates
   - Set up OAuth providers if needed
   - Test user registration/login

2. STORAGE SETUP:
   - Go to Storage → Create bucket: 'exchange-documents'
   - Set bucket policies for file access
   - Configure upload restrictions

3. UPDATE DEFAULT ADMIN:
   - Login as admin@peak1031.com / ChangeMe123!
   - Change password immediately
   - Update admin profile information

4. ENVIRONMENT VARIABLES:
   Update your app with these Supabase values:
   - SUPABASE_URL=your_project_url
   - SUPABASE_ANON_KEY=your_anon_key
   - SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

5. PRACTICE PARTNER INTEGRATION:
   - Add PP OAuth credentials to oauth_tokens table
   - Configure PP sync settings in admin_settings
   - Test sync functionality

6. RLS POLICY CUSTOMIZATION:
   - Review and adjust RLS policies for your security requirements
   - Test access patterns with different user roles

7. TESTING:
   - Create test exchanges and participants
   - Test messaging system
   - Verify document upload/download
   - Test task management workflow

8. CUSTOMIZATION:
   - Modify task templates for your workflow
   - Update document templates
   - Customize email templates
   - Adjust admin settings

*/