-- Comprehensive Database Indexing for Enhanced Query Performance
-- Generated for Peak1031 Exchange Management Platform
-- Optimizes database for OSS LLM query generation and natural language processing

-- ==============================================================================
-- PRIMARY INDEXES FOR CORE TABLES
-- ==============================================================================

-- Users table indexes
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));

-- Contacts table comprehensive indexes
CREATE INDEX IF NOT EXISTS idx_contacts_pp_sync ON contacts(pp_contact_id, last_sync_at);
CREATE INDEX IF NOT EXISTS idx_contacts_type_active ON contacts(contact_type, is_active);
CREATE INDEX IF NOT EXISTS idx_contacts_company_lower ON contacts(lower(company));
CREATE INDEX IF NOT EXISTS idx_contacts_name_search ON contacts(lower(first_name), lower(last_name));
CREATE INDEX IF NOT EXISTS idx_contacts_location ON contacts(city, state, zip_code);
CREATE INDEX IF NOT EXISTS idx_contacts_email_lower ON contacts(lower(email));

-- ==============================================================================
-- EXCHANGES TABLE - CRITICAL FOR 1031 BUSINESS LOGIC
-- ==============================================================================

-- Core exchange indexes
CREATE INDEX IF NOT EXISTS idx_exchanges_status_date ON exchanges(status, start_date);
CREATE INDEX IF NOT EXISTS idx_exchanges_coordinator_status ON exchanges(coordinator_id, status);
CREATE INDEX IF NOT EXISTS idx_exchanges_client_status ON exchanges(client_id, status);

-- 1031-specific deadline indexes (CRITICAL for business logic)
CREATE INDEX IF NOT EXISTS idx_exchanges_day45_status ON exchanges(day_45, status) WHERE day_45 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exchanges_day180_status ON exchanges(day_180, status) WHERE day_180 IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exchanges_deadlines_approaching ON exchanges(day_45, day_180) 
  WHERE day_45 >= CURRENT_DATE OR day_180 >= CURRENT_DATE;

-- Property location indexes for geographic queries
CREATE INDEX IF NOT EXISTS idx_exchanges_rel_property_state ON exchanges(rel_property_state);
CREATE INDEX IF NOT EXISTS idx_exchanges_rel_property_location ON exchanges(rel_property_city, rel_property_state);
CREATE INDEX IF NOT EXISTS idx_exchanges_rep_property_location ON exchanges(rep_1_city, rep_1_state);

-- Financial data indexes
CREATE INDEX IF NOT EXISTS idx_exchanges_proceeds ON exchanges(proceeds) WHERE proceeds IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exchanges_rel_value ON exchanges(rel_value) WHERE rel_value IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exchanges_rep_value ON exchanges(rep_1_value) WHERE rep_1_value IS NOT NULL;

-- Exchange type and bank indexes
CREATE INDEX IF NOT EXISTS idx_exchanges_type ON exchanges(type_of_exchange);
CREATE INDEX IF NOT EXISTS idx_exchanges_bank ON exchanges(bank);

-- Important date indexes
CREATE INDEX IF NOT EXISTS idx_exchanges_close_escrow ON exchanges(close_of_escrow_date);
CREATE INDEX IF NOT EXISTS idx_exchanges_contract_dates ON exchanges(rel_contract_date, rep_1_contract_date);

-- PracticePanther sync indexes
CREATE INDEX IF NOT EXISTS idx_exchanges_pp_sync ON exchanges(pp_matter_id, last_sync_at);
CREATE INDEX IF NOT EXISTS idx_exchanges_pp_data ON exchanges USING GIN(pp_data);

-- ==============================================================================
-- TASKS TABLE - WORKFLOW AND ASSIGNMENT OPTIMIZATION
-- ==============================================================================

-- Core task indexes
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_status ON tasks(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_tasks_exchange_status ON tasks(exchange_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);

-- Due date indexes (critical for overdue detection)
CREATE INDEX IF NOT EXISTS idx_tasks_due_date_status ON tasks(due_date, status) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_overdue ON tasks(due_date, status) 
  WHERE due_date < CURRENT_DATE AND status NOT IN ('COMPLETED', 'CANCELLED');

-- Completion tracking
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed_at, status);
CREATE INDEX IF NOT EXISTS idx_tasks_time_tracking ON tasks(estimated_hours, actual_hours);

-- PracticePanther sync
CREATE INDEX IF NOT EXISTS idx_tasks_pp_sync ON tasks(pp_task_id, last_sync_at);

-- ==============================================================================
-- DOCUMENTS TABLE - FILE MANAGEMENT OPTIMIZATION
-- ==============================================================================

-- Core document indexes
CREATE INDEX IF NOT EXISTS idx_documents_exchange_category ON documents(exchange_id, category);
CREATE INDEX IF NOT EXISTS idx_documents_uploader_date ON documents(uploaded_by, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_category_date ON documents(category, created_at);

-- File metadata indexes
CREATE INDEX IF NOT EXISTS idx_documents_mime_type ON documents(mime_type);
CREATE INDEX IF NOT EXISTS idx_documents_file_size ON documents(file_size);

-- Security and template indexes
CREATE INDEX IF NOT EXISTS idx_documents_pin_required ON documents(pin_required);
CREATE INDEX IF NOT EXISTS idx_documents_template ON documents(is_template, template_category);
CREATE INDEX IF NOT EXISTS idx_documents_storage ON documents(storage_provider);
CREATE INDEX IF NOT EXISTS idx_documents_version ON documents(exchange_id, version);

-- ==============================================================================
-- MESSAGES TABLE - COMMUNICATION OPTIMIZATION
-- ==============================================================================

-- Core messaging indexes
CREATE INDEX IF NOT EXISTS idx_messages_exchange_date ON messages(exchange_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender_date ON messages(sender_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_type_date ON messages(message_type, created_at);

-- Threading support
CREATE INDEX IF NOT EXISTS idx_messages_parent ON messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(exchange_id, parent_message_id, created_at);

-- Read status (JSONB optimization)
CREATE INDEX IF NOT EXISTS idx_messages_read_by ON messages USING GIN(read_by);

-- Soft deletion support
CREATE INDEX IF NOT EXISTS idx_messages_active ON messages(created_at) WHERE deleted_at IS NULL;

-- ==============================================================================
-- EXCHANGE PARTICIPANTS - RELATIONSHIP OPTIMIZATION
-- ==============================================================================

-- Core participation indexes
CREATE INDEX IF NOT EXISTS idx_participants_exchange ON exchange_participants(exchange_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON exchange_participants(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_participants_contact ON exchange_participants(contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_participants_role ON exchange_participants(exchange_id, role);

-- Permissions optimization
CREATE INDEX IF NOT EXISTS idx_participants_permissions ON exchange_participants USING GIN(permissions);

-- Active participants (soft deletion)
CREATE INDEX IF NOT EXISTS idx_participants_active ON exchange_participants(exchange_id, role) 
  WHERE deleted_at IS NULL;

-- ==============================================================================
-- NOTIFICATIONS TABLE - USER NOTIFICATION OPTIMIZATION
-- ==============================================================================

-- Core notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_type ON notifications(user_id, type);
CREATE INDEX IF NOT EXISTS idx_notifications_priority_date ON notifications(priority, created_at);

-- Entity relationship indexes
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(related_entity_type, related_entity_id);

-- Expiration handling
CREATE INDEX IF NOT EXISTS idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_active ON notifications(user_id, created_at) 
  WHERE expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP;

-- ==============================================================================
-- AUDIT LOGS - SECURITY AND COMPLIANCE OPTIMIZATION
-- ==============================================================================

-- Core audit indexes
CREATE INDEX IF NOT EXISTS idx_audit_user_action ON audit_logs(user_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_date ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_success ON audit_logs(success, created_at);

-- Security monitoring
CREATE INDEX IF NOT EXISTS idx_audit_ip ON audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_session ON audit_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_failures ON audit_logs(user_id, success, created_at) WHERE success = false;

-- Data change tracking
CREATE INDEX IF NOT EXISTS idx_audit_changes ON audit_logs USING GIN(old_values, new_values);

-- ==============================================================================
-- COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ==============================================================================

-- Complex exchange queries
CREATE INDEX IF NOT EXISTS idx_exchanges_coordinator_client_status ON exchanges(coordinator_id, client_id, status);
CREATE INDEX IF NOT EXISTS idx_exchanges_location_status ON exchanges(rel_property_state, status, start_date);
CREATE INDEX IF NOT EXISTS idx_exchanges_value_status ON exchanges(status, proceeds, rel_value);

-- Complex task queries
CREATE INDEX IF NOT EXISTS idx_tasks_assignment_exchange ON tasks(assigned_to, exchange_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority_due ON tasks(priority, due_date, status);

-- Complex document queries
CREATE INDEX IF NOT EXISTS idx_documents_exchange_uploader ON documents(exchange_id, uploaded_by, created_at);

-- Complex message queries  
CREATE INDEX IF NOT EXISTS idx_messages_exchange_sender ON messages(exchange_id, sender_id, created_at);

-- ==============================================================================
-- FULL-TEXT SEARCH INDEXES
-- ==============================================================================

-- Text search on exchanges
CREATE INDEX IF NOT EXISTS idx_exchanges_search ON exchanges USING GIN(
  to_tsvector('english', COALESCE(name, '') || ' ' || 
  COALESCE(rel_property_address, '') || ' ' || 
  COALESCE(rep_1_property_address, ''))
);

-- Text search on contacts
CREATE INDEX IF NOT EXISTS idx_contacts_search ON contacts USING GIN(
  to_tsvector('english', COALESCE(first_name, '') || ' ' || 
  COALESCE(last_name, '') || ' ' || 
  COALESCE(company, '') || ' ' || 
  COALESCE(email, ''))
);

-- Text search on tasks
CREATE INDEX IF NOT EXISTS idx_tasks_search ON tasks USING GIN(
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(description, ''))
);

-- Text search on documents
CREATE INDEX IF NOT EXISTS idx_documents_search ON documents USING GIN(
  to_tsvector('english', COALESCE(name, ''))
);

-- Text search on messages
CREATE INDEX IF NOT EXISTS idx_messages_search ON messages USING GIN(
  to_tsvector('english', content)
);

-- ==============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERED QUERIES
-- ==============================================================================

-- Active records only
CREATE INDEX IF NOT EXISTS idx_users_active_only ON users(email, role) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_contacts_active_only ON contacts(contact_type, company) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_exchanges_active_only ON exchanges(start_date, coordinator_id) 
  WHERE status IN ('ACTIVE', 'IN_PROGRESS');

-- Upcoming deadlines (next 30 days)
CREATE INDEX IF NOT EXISTS idx_exchanges_upcoming_day45 ON exchanges(day_45, id) 
  WHERE day_45 BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';
CREATE INDEX IF NOT EXISTS idx_exchanges_upcoming_day180 ON exchanges(day_180, id) 
  WHERE day_180 BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days';

-- Recent activity (last 30 days)
CREATE INDEX IF NOT EXISTS idx_recent_exchanges ON exchanges(created_at, status) 
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';
CREATE INDEX IF NOT EXISTS idx_recent_tasks ON tasks(created_at, status) 
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days';

-- ==============================================================================
-- STATISTICS UPDATE
-- ==============================================================================

-- Update table statistics for query planner optimization
ANALYZE users;
ANALYZE contacts;
ANALYZE exchanges;
ANALYZE exchange_participants;
ANALYZE tasks;
ANALYZE documents;
ANALYZE messages;
ANALYZE notifications;
ANALYZE audit_logs;

-- ==============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ==============================================================================

COMMENT ON INDEX idx_exchanges_deadlines_approaching IS 'Critical index for 1031 deadline monitoring and alerts';
COMMENT ON INDEX idx_tasks_overdue IS 'Optimizes overdue task detection queries';
COMMENT ON INDEX idx_exchanges_search IS 'Full-text search across exchange names and property addresses';
COMMENT ON INDEX idx_contacts_search IS 'Full-text search across contact information';

-- ==============================================================================
-- COMPLETION LOG
-- ==============================================================================

-- Log the completion of comprehensive indexing
INSERT INTO audit_logs (
  action, 
  entity_type, 
  entity_id,
  new_values,
  success,
  created_at
) VALUES (
  'create',
  'system',
  NULL,
  '{"migration": "026-comprehensive-indexes", "indexes_created": "60+", "optimization": "enhanced_query_performance"}',
  true,
  NOW()
);

-- Output completion message
DO $$
BEGIN
  RAISE NOTICE 'Comprehensive database indexing completed successfully!';
  RAISE NOTICE 'Created 60+ indexes optimized for OSS LLM query generation';
  RAISE NOTICE 'Database is now fully indexed for natural language processing';
END $$;