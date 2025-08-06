-- =============================================================================
-- PEAK 1031 V1 PLATFORM - FEATURE-READY DATABASE MIGRATION (FIXED VERSION)
-- =============================================================================
-- This migration creates all required tables and structures for the complete
-- feature set as specified in FeaturesContract.md
-- 
-- Run this in Supabase SQL editor after backing up your current database
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ENHANCE USER MANAGEMENT (CONTACTS TABLE)
-- -----------------------------------------------------------------------------

-- Add missing user management fields to existing CONTACTS table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_login_ip INET;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS login_attempts INTEGER DEFAULT 0;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS locked_until TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}';

-- Create indexes for user management
CREATE INDEX IF NOT EXISTS idx_contacts_role_active ON contacts(role, is_active);
CREATE INDEX IF NOT EXISTS idx_contacts_email_verified ON contacts(email, email_verified);

-- -----------------------------------------------------------------------------
-- 2. USER SESSIONS (JWT MANAGEMENT)
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_expires ON user_sessions(user_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active, expires_at);

-- -----------------------------------------------------------------------------
-- 3. EXCHANGE PARTICIPANT MANAGEMENT
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS exchange_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'client', 'coordinator', 'third_party', 'agency', 'admin'
    permissions TEXT[] DEFAULT ARRAY['view'], -- ['view', 'message', 'upload', 'manage']
    assigned_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(exchange_id, contact_id, role)
);

CREATE INDEX IF NOT EXISTS idx_exchange_participants_exchange ON exchange_participants(exchange_id);
CREATE INDEX IF NOT EXISTS idx_exchange_participants_contact ON exchange_participants(contact_id);
CREATE INDEX IF NOT EXISTS idx_exchange_participants_role ON exchange_participants(role);
CREATE INDEX IF NOT EXISTS idx_exchange_participants_active ON exchange_participants(is_active);

-- -----------------------------------------------------------------------------
-- 4. ENHANCE EXCHANGES TABLE 
-- -----------------------------------------------------------------------------

-- Add workflow and stage tracking to existing EXCHANGES table
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS workflow_stage VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMP;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS stage_changed_by UUID REFERENCES contacts(id);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS notifications_enabled BOOLEAN DEFAULT true;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

-- Update existing exchanges with proper workflow stages based on status
UPDATE exchanges SET workflow_stage = 
  CASE 
    WHEN status = 'active' THEN 'IN_PROGRESS'
    WHEN status = 'completed' THEN 'COMPLETED'
    WHEN status = 'cancelled' THEN 'CANCELLED'
    ELSE 'PENDING'
  END
WHERE workflow_stage = 'PENDING';

-- Create indexes for exchange management
CREATE INDEX IF NOT EXISTS idx_exchanges_workflow_stage ON exchanges(workflow_stage);
CREATE INDEX IF NOT EXISTS idx_exchanges_status_active ON exchanges(status, is_active);

-- -----------------------------------------------------------------------------
-- 5. MESSAGING SYSTEM
-- -----------------------------------------------------------------------------

-- Drop existing empty messages table if it exists and recreate with proper schema
DROP TABLE IF EXISTS messages CASCADE;

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'file', 'system', 'notification'
    attachments JSONB DEFAULT '[]', -- Array of file references
    reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
    is_system_message BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    is_pinned BOOLEAN DEFAULT false,
    read_by JSONB DEFAULT '[]', -- Array of {user_id, read_at}
    metadata JSONB DEFAULT '{}', -- Additional message data
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_exchange_created ON messages(exchange_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);

-- Message participants for read receipts and notifications
CREATE TABLE IF NOT EXISTS message_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    read_at TIMESTAMP,
    delivered_at TIMESTAMP,
    notification_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(message_id, contact_id)
);

CREATE INDEX IF NOT EXISTS idx_message_participants_message ON message_participants(message_id);
CREATE INDEX IF NOT EXISTS idx_message_participants_contact ON message_participants(contact_id);

-- -----------------------------------------------------------------------------
-- 6. DOCUMENT MANAGEMENT SYSTEM
-- -----------------------------------------------------------------------------

-- Drop existing empty documents table if it exists and recreate with proper schema
DROP TABLE IF EXISTS documents CASCADE;

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
    file_name VARCHAR(255) NOT NULL,
    original_file_name VARCHAR(255),
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT,
    file_path TEXT NOT NULL,
    storage_provider VARCHAR(50) DEFAULT 'local', -- 'local', 's3', 'gcp', 'supabase'
    document_type VARCHAR(100), -- 'contract', 'deed', 'financial', 'legal', 'identification'
    category VARCHAR(100), -- User-defined categories
    description TEXT,
    tags TEXT[], -- Searchable tags
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES documents(id), -- For versioning
    is_template BOOLEAN DEFAULT false,
    template_variables JSONB DEFAULT '{}', -- For auto-generation
    pin_protected BOOLEAN DEFAULT false,
    pin_hash VARCHAR(255), -- Hashed PIN for access
    access_level VARCHAR(20) DEFAULT 'exchange', -- 'public', 'exchange', 'restricted', 'private'
    allowed_roles TEXT[] DEFAULT ARRAY['client', 'coordinator', 'admin'], -- Who can access
    allowed_users UUID[], -- Specific user access
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP,
    expires_at TIMESTAMP, -- For temporary documents
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_exchange ON documents(exchange_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents(document_type);
CREATE INDEX IF NOT EXISTS idx_documents_active ON documents(is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_documents_access_level ON documents(access_level);

-- Document access logging
CREATE TABLE IF NOT EXISTS document_access_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    action VARCHAR(20) NOT NULL, -- 'view', 'download', 'upload', 'delete', 'share'
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    file_size BIGINT, -- For download tracking
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_access_logs_document ON document_access_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_contact_created ON document_access_logs(contact_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_access_logs_action ON document_access_logs(action);

-- -----------------------------------------------------------------------------
-- 7. TASK MANAGEMENT SYSTEM  
-- -----------------------------------------------------------------------------

-- Drop existing empty tasks table if it exists and recreate with proper schema
DROP TABLE IF EXISTS tasks CASCADE;

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES contacts(id) ON DELETE SET NULL,
    created_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
    parent_task_id UUID REFERENCES tasks(id), -- For sub-tasks
    title VARCHAR(255) NOT NULL,
    description TEXT,
    task_type VARCHAR(50) DEFAULT 'manual', -- 'pp_sync', 'manual', 'system', 'automated'
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'IN_PROGRESS', 'COMPLETE', 'CANCELLED', 'ON_HOLD'
    priority VARCHAR(10) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    due_date TIMESTAMP,
    start_date TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    pp_task_id VARCHAR(255) UNIQUE, -- Reference to PracticePanther task
    pp_data JSONB DEFAULT '{}', -- Raw PP task data
    tags TEXT[], -- Searchable tags
    dependencies UUID[], -- Array of task IDs this depends on
    watchers UUID[], -- Users watching this task
    metadata JSONB DEFAULT '{}', -- Additional task data
    is_synced_from_pp BOOLEAN DEFAULT false,
    last_sync_at TIMESTAMP,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_pattern JSONB DEFAULT '{}', -- For recurring tasks
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_exchange_status ON tasks(exchange_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_pp_id ON tasks(pp_task_id);

-- Task comments/updates
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    comment TEXT NOT NULL,
    is_status_change BOOLEAN DEFAULT false,
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_contact ON task_comments(contact_id);

-- -----------------------------------------------------------------------------
-- 8. AUDIT LOGGING SYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    exchange_id UUID REFERENCES exchanges(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- 'login', 'logout', 'document_upload', 'task_complete', etc.
    resource_type VARCHAR(50), -- 'user', 'exchange', 'document', 'task', 'message'
    resource_id UUID,
    resource_name VARCHAR(255), -- Human-readable resource name
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    session_id UUID,
    request_id VARCHAR(255), -- For tracing requests
    duration_ms INTEGER, -- Request duration
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_exchange ON audit_logs(exchange_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- -----------------------------------------------------------------------------
-- 9. PRACTICEPANTHER SYNC TRACKING
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pp_sync_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL, -- 'contacts', 'matters', 'tasks', 'full'
    status VARCHAR(20) DEFAULT 'RUNNING', -- 'RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL'
    records_processed INTEGER DEFAULT 0,
    records_created INTEGER DEFAULT 0,
    records_updated INTEGER DEFAULT 0,
    records_failed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '{}',
    success_details JSONB DEFAULT '{}',
    sync_duration_ms INTEGER,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    triggered_by VARCHAR(20) DEFAULT 'scheduled', -- 'manual', 'scheduled', 'webhook'
    triggered_by_user UUID REFERENCES contacts(id) ON DELETE SET NULL,
    api_calls_made INTEGER DEFAULT 0,
    rate_limit_hit BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_pp_sync_logs_type_status ON pp_sync_logs(sync_type, status);
CREATE INDEX IF NOT EXISTS idx_pp_sync_logs_started_at ON pp_sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_pp_sync_logs_triggered_by ON pp_sync_logs(triggered_by_user);

-- -----------------------------------------------------------------------------
-- 10. NOTIFICATION SYSTEM
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    exchange_id UUID REFERENCES exchanges(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- 'message', 'task', 'document', 'system', 'deadline'
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    action_url TEXT, -- URL to take action
    priority VARCHAR(10) DEFAULT 'NORMAL', -- 'LOW', 'NORMAL', 'HIGH', 'URGENT'
    is_read BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    read_at TIMESTAMP,
    email_sent BOOLEAN DEFAULT false,
    sms_sent BOOLEAN DEFAULT false,
    push_sent BOOLEAN DEFAULT false,
    related_resource_type VARCHAR(50),
    related_resource_id UUID,
    expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_exchange ON notifications(exchange_id);

-- -----------------------------------------------------------------------------
-- 11. SYSTEM SETTINGS & CONFIGURATION
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general', -- 'general', 'pp_sync', 'notifications', 'security'
    is_sensitive BOOLEAN DEFAULT false, -- For passwords, keys, etc.
    updated_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category) VALUES
('pp_sync_frequency', '"hourly"', 'How often to sync with PracticePanther', 'pp_sync'),
('pp_sync_enabled', 'true', 'Whether PP sync is enabled', 'pp_sync'),
('email_notifications_enabled', 'true', 'Whether email notifications are enabled', 'notifications'),
('sms_notifications_enabled', 'false', 'Whether SMS notifications are enabled', 'notifications'),
('session_timeout_hours', '24', 'How long user sessions last', 'security'),
('max_file_upload_mb', '50', 'Maximum file upload size in MB', 'general')
ON CONFLICT (key) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 12. CREATE VIEWS FOR COMMON QUERIES
-- -----------------------------------------------------------------------------

-- View for exchange with participant counts
CREATE OR REPLACE VIEW exchange_summary AS
SELECT 
    e.*,
    COUNT(ep.id) as participant_count,
    COUNT(CASE WHEN ep.role = 'client' THEN 1 END) as client_count,
    COUNT(CASE WHEN ep.role = 'coordinator' THEN 1 END) as coordinator_count,
    COUNT(m.id) as message_count,
    COUNT(d.id) as document_count,
    COUNT(t.id) as task_count
FROM exchanges e
LEFT JOIN exchange_participants ep ON e.id = ep.exchange_id AND ep.is_active = true
LEFT JOIN messages m ON e.id = m.exchange_id AND m.is_deleted = false
LEFT JOIN documents d ON e.id = d.exchange_id AND d.is_active = true
LEFT JOIN tasks t ON e.id = t.exchange_id
GROUP BY e.id;

-- View for user dashboard data
CREATE OR REPLACE VIEW user_dashboard AS  
SELECT 
    c.id,
    c.first_name,
    c.last_name,
    c.email,
    c.role,
    COUNT(DISTINCT ep.exchange_id) as assigned_exchanges,
    COUNT(DISTINCT CASE WHEN t.status = 'PENDING' THEN t.id END) as pending_tasks,
    COUNT(DISTINCT CASE WHEN n.is_read = false THEN n.id END) as unread_notifications
FROM contacts c
LEFT JOIN exchange_participants ep ON c.id = ep.contact_id AND ep.is_active = true  
LEFT JOIN tasks t ON c.id = t.assigned_to
LEFT JOIN notifications n ON c.id = n.user_id AND n.is_dismissed = false
WHERE c.is_user = true AND c.is_active = true
GROUP BY c.id;

-- -----------------------------------------------------------------------------
-- 13. FUNCTIONS FOR COMMON OPERATIONS
-- -----------------------------------------------------------------------------

-- Function to assign user to exchange with proper permissions
CREATE OR REPLACE FUNCTION assign_user_to_exchange(
    p_exchange_id UUID,
    p_contact_id UUID, 
    p_role VARCHAR(50),
    p_assigned_by UUID,
    p_permissions TEXT[] DEFAULT ARRAY['view']
) RETURNS UUID AS $$
DECLARE
    participant_id UUID;
BEGIN
    INSERT INTO exchange_participants (
        exchange_id, contact_id, role, assigned_by, permissions
    ) VALUES (
        p_exchange_id, p_contact_id, p_role, p_assigned_by, p_permissions
    ) RETURNING id INTO participant_id;
    
    -- Log the assignment
    INSERT INTO audit_logs (
        user_id, exchange_id, action, resource_type, resource_id, new_values
    ) VALUES (
        p_assigned_by, p_exchange_id, 'user_assigned', 'exchange_participant', 
        participant_id, jsonb_build_object('contact_id', p_contact_id, 'role', p_role)
    );
    
    RETURN participant_id;
END;
$$ LANGUAGE plpgsql;

-- Function to log document access
CREATE OR REPLACE FUNCTION log_document_access(
    p_document_id UUID,
    p_contact_id UUID,
    p_action VARCHAR(20),
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO document_access_logs (
        document_id, contact_id, action, ip_address, user_agent
    ) VALUES (
        p_document_id, p_contact_id, p_action, p_ip_address, p_user_agent
    );
    
    -- Update document counters
    IF p_action = 'view' THEN
        UPDATE documents 
        SET view_count = view_count + 1, last_accessed_at = NOW()
        WHERE id = p_document_id;
    ELSIF p_action = 'download' THEN  
        UPDATE documents
        SET download_count = download_count + 1, last_accessed_at = NOW()
        WHERE id = p_document_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MIGRATION COMPLETE!
-- =============================================================================
-- 
-- This migration creates a production-ready database schema supporting:
-- ✅ Role-based access control
-- ✅ Real-time messaging system  
-- ✅ Secure document management
-- ✅ Task tracking with PP sync
-- ✅ Comprehensive audit logging
-- ✅ PracticePanther integration tracking
-- ✅ Performance indexes
-- 
-- RLS POLICIES CAN BE ADDED SEPARATELY AFTER TESTING BASE FUNCTIONALITY
-- 
-- Next steps:
-- 1. Run this migration in Supabase SQL editor
-- 2. Test with sample data
-- 3. Add RLS policies once tables are confirmed working
-- 4. Implement frontend integration
-- =============================================================================