-- ============================================
-- PERFORMANCE INDEXES FOR PEAK 1031 PLATFORM
-- Version: 1.0.0
-- Date: 2025-08-07
-- ============================================

-- ============================================
-- EXCHANGES TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_exchanges_status 
    ON exchanges(status);

CREATE INDEX IF NOT EXISTS idx_exchanges_client_id 
    ON exchanges(client_id);

CREATE INDEX IF NOT EXISTS idx_exchanges_coordinator_id 
    ON exchanges(coordinator_id);

CREATE INDEX IF NOT EXISTS idx_exchanges_dates 
    ON exchanges(identification_deadline, exchange_deadline);

CREATE INDEX IF NOT EXISTS idx_exchanges_created_at 
    ON exchanges(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exchanges_pp_matter_id 
    ON exchanges(pp_matter_id);

CREATE INDEX IF NOT EXISTS idx_exchanges_workflow_stage 
    ON exchanges(workflow_stage);

CREATE INDEX IF NOT EXISTS idx_exchanges_compliance_status 
    ON exchanges(compliance_status);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_exchanges_status_created 
    ON exchanges(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exchanges_client_status 
    ON exchanges(client_id, status);

-- ============================================
-- MESSAGES TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_messages_exchange_id 
    ON messages(exchange_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id 
    ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_messages_created_at 
    ON messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_exchange_created 
    ON messages(exchange_id, created_at DESC);

-- ============================================
-- DOCUMENTS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_documents_exchange_id 
    ON documents(exchange_id);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by 
    ON documents(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_documents_category 
    ON documents(category);

CREATE INDEX IF NOT EXISTS idx_documents_created_at 
    ON documents(created_at DESC);

-- ============================================
-- EXCHANGE_PARTICIPANTS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_participants_exchange_id 
    ON exchange_participants(exchange_id);

CREATE INDEX IF NOT EXISTS idx_participants_contact_id 
    ON exchange_participants(contact_id);

CREATE INDEX IF NOT EXISTS idx_participants_user_id 
    ON exchange_participants(user_id);

CREATE INDEX IF NOT EXISTS idx_participants_role 
    ON exchange_participants(role);

-- ============================================
-- TASKS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tasks_exchange_id 
    ON tasks(exchange_id);

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to 
    ON tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_tasks_status 
    ON tasks(status);

CREATE INDEX IF NOT EXISTS idx_tasks_due_date 
    ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_tasks_status_due 
    ON tasks(status, due_date);

-- ============================================
-- INVOICES TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_invoices_exchange_id 
    ON invoices(exchange_id);

CREATE INDEX IF NOT EXISTS idx_invoices_contact_id 
    ON invoices(contact_id);

CREATE INDEX IF NOT EXISTS idx_invoices_status 
    ON invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoices_due_date 
    ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_invoices_pp_invoice_id 
    ON invoices(pp_invoice_id);

-- ============================================
-- NOTIFICATIONS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notifications_user_id 
    ON notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_exchange_id 
    ON notifications(exchange_id);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
    ON notifications(is_read);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
    ON notifications(user_id, is_read) 
    WHERE is_read = false;

-- ============================================
-- AUDIT_LOGS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
    ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity 
    ON audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
    ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at 
    ON audit_logs(created_at DESC);

-- Partial index for recent logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent 
    ON audit_logs(created_at DESC) 
    WHERE created_at > CURRENT_DATE - INTERVAL '30 days';

-- ============================================
-- CONTACTS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_contacts_email 
    ON contacts(email);

CREATE INDEX IF NOT EXISTS idx_contacts_pp_contact_id 
    ON contacts(pp_contact_id);

CREATE INDEX IF NOT EXISTS idx_contacts_type 
    ON contacts(contact_type);

CREATE INDEX IF NOT EXISTS idx_contacts_company 
    ON contacts(company);

-- ============================================
-- USERS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_email 
    ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_role 
    ON users(role);

CREATE INDEX IF NOT EXISTS idx_users_pp_user_id 
    ON users(pp_user_id);

CREATE INDEX IF NOT EXISTS idx_users_is_active 
    ON users(is_active);

-- ============================================
-- AI_ANALYSIS TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ai_analysis_exchange_id 
    ON ai_analysis(exchange_id);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_type 
    ON ai_analysis(analysis_type);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_created_at 
    ON ai_analysis(created_at DESC);

-- ============================================
-- EXCHANGE_TIMELINE TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_timeline_exchange_id 
    ON exchange_timeline(exchange_id);

CREATE INDEX IF NOT EXISTS idx_timeline_event_date 
    ON exchange_timeline(event_date);

CREATE INDEX IF NOT EXISTS idx_timeline_is_deadline 
    ON exchange_timeline(is_deadline) 
    WHERE is_deadline = true;

-- ============================================
-- EXCHANGE_NOTES TABLE INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_notes_exchange_id 
    ON exchange_notes(exchange_id);

CREATE INDEX IF NOT EXISTS idx_notes_user_id 
    ON exchange_notes(user_id);

CREATE INDEX IF NOT EXISTS idx_notes_created_at 
    ON exchange_notes(created_at DESC);

-- ============================================
-- CHAT TABLES INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id 
    ON chat_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_exchange_id 
    ON chat_sessions(exchange_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id 
    ON chat_messages(session_id);

-- ============================================
-- FULL TEXT SEARCH INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_exchanges_search 
    ON exchanges USING gin(
        to_tsvector('english', 
            COALESCE(name, '') || ' ' || 
            COALESCE(description, '') || ' ' || 
            COALESCE(notes, '')
        )
    );

CREATE INDEX IF NOT EXISTS idx_messages_search 
    ON messages USING gin(
        to_tsvector('english', content)
    );

CREATE INDEX IF NOT EXISTS idx_documents_search 
    ON documents USING gin(
        to_tsvector('english', 
            COALESCE(filename, '') || ' ' || 
            COALESCE(description, '')
        )
    );

-- ============================================
-- JSONB INDEXES FOR PP DATA
-- ============================================
CREATE INDEX IF NOT EXISTS idx_exchanges_pp_data 
    ON exchanges USING gin(pp_data);

CREATE INDEX IF NOT EXISTS idx_exchanges_metadata 
    ON exchanges USING gin(metadata);

CREATE INDEX IF NOT EXISTS idx_exchanges_custom_fields 
    ON exchanges USING gin(custom_field_values);

-- ============================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================
ANALYZE exchanges;
ANALYZE contacts;
ANALYZE users;
ANALYZE messages;
ANALYZE documents;
ANALYZE exchange_participants;
ANALYZE tasks;
ANALYZE invoices;
ANALYZE audit_logs;