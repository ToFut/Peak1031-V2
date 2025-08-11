-- ============================================
-- ANALYTICS VIEWS FOR PEAK 1031 PLATFORM
-- Version: 1.0.0
-- Date: 2025-08-07
-- ============================================

-- ============================================
-- EXCHANGE ANALYTICS VIEWS
-- ============================================

-- Summary view for exchanges with key metrics
CREATE OR REPLACE VIEW v_exchange_summary AS
SELECT 
    e.id,
    e.name,
    e.exchange_number,
    e.status,
    e.workflow_stage,
    e.exchange_value,
    e.identification_deadline,
    e.exchange_deadline,
    e.created_at,
    c.first_name || ' ' || c.last_name AS client_name,
    c.email AS client_email,
    c.company AS client_company,
    coord.first_name || ' ' || coord.last_name AS coordinator_name,
    -- Days remaining calculations
    CASE 
        WHEN e.identification_deadline IS NOT NULL THEN 
            EXTRACT(DAYS FROM (e.identification_deadline - CURRENT_DATE))
        ELSE NULL 
    END AS identification_days_remaining,
    CASE 
        WHEN e.exchange_deadline IS NOT NULL THEN 
            EXTRACT(DAYS FROM (e.exchange_deadline - CURRENT_DATE))
        ELSE NULL 
    END AS exchange_days_remaining,
    -- Participant counts
    (SELECT COUNT(*) FROM exchange_participants ep WHERE ep.exchange_id = e.id) AS participant_count,
    -- Document counts
    (SELECT COUNT(*) FROM documents d WHERE d.exchange_id = e.id) AS document_count,
    -- Task counts
    (SELECT COUNT(*) FROM tasks t WHERE t.exchange_id = e.id) AS task_count,
    (SELECT COUNT(*) FROM tasks t WHERE t.exchange_id = e.id AND t.status = 'completed') AS completed_tasks,
    -- Message counts
    (SELECT COUNT(*) FROM messages m WHERE m.exchange_id = e.id) AS message_count,
    -- Last activity
    (SELECT MAX(m.created_at) FROM messages m WHERE m.exchange_id = e.id) AS last_message_date
FROM exchanges e
LEFT JOIN contacts c ON e.client_id = c.id
LEFT JOIN users coord ON e.coordinator_id = coord.id;

-- Exchange deadlines view for dashboard alerts
CREATE OR REPLACE VIEW v_exchange_deadlines AS
SELECT 
    e.id,
    e.name,
    e.exchange_number,
    e.status,
    c.first_name || ' ' || c.last_name AS client_name,
    'identification' AS deadline_type,
    e.identification_deadline AS deadline_date,
    EXTRACT(DAYS FROM (e.identification_deadline - CURRENT_DATE)) AS days_remaining,
    CASE 
        WHEN e.identification_deadline < CURRENT_DATE THEN 'overdue'
        WHEN e.identification_deadline <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
        WHEN e.identification_deadline <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
        ELSE 'normal'
    END AS urgency_level
FROM exchanges e
LEFT JOIN contacts c ON e.client_id = c.id
WHERE e.identification_deadline IS NOT NULL
    AND e.status IN ('active', 'pending')

UNION ALL

SELECT 
    e.id,
    e.name,
    e.exchange_number,
    e.status,
    c.first_name || ' ' || c.last_name AS client_name,
    'exchange' AS deadline_type,
    e.exchange_deadline AS deadline_date,
    EXTRACT(DAYS FROM (e.exchange_deadline - CURRENT_DATE)) AS days_remaining,
    CASE 
        WHEN e.exchange_deadline < CURRENT_DATE THEN 'overdue'
        WHEN e.exchange_deadline <= CURRENT_DATE + INTERVAL '7 days' THEN 'urgent'
        WHEN e.exchange_deadline <= CURRENT_DATE + INTERVAL '30 days' THEN 'warning'
        ELSE 'normal'
    END AS urgency_level
FROM exchanges e
LEFT JOIN contacts c ON e.client_id = c.id
WHERE e.exchange_deadline IS NOT NULL
    AND e.status IN ('active', 'pending');

-- ============================================
-- FINANCIAL VIEWS
-- ============================================

-- Exchange financial summary
CREATE OR REPLACE VIEW v_exchange_financials AS
SELECT 
    e.id AS exchange_id,
    e.name AS exchange_name,
    e.exchange_number,
    e.exchange_value,
    -- Invoice totals
    COALESCE(SUM(i.total_amount), 0) AS total_invoiced,
    COALESCE(SUM(CASE WHEN i.status = 'paid' THEN i.total_amount ELSE 0 END), 0) AS total_paid,
    COALESCE(SUM(CASE WHEN i.status != 'paid' THEN i.total_amount ELSE 0 END), 0) AS total_outstanding,
    -- Expense totals  
    COALESCE(SUM(ex.amount), 0) AS total_expenses,
    COALESCE(SUM(CASE WHEN ex.is_billable THEN ex.amount ELSE 0 END), 0) AS billable_expenses,
    -- Calculated fields
    e.exchange_value - COALESCE(SUM(ex.amount), 0) AS net_value,
    COUNT(DISTINCT i.id) AS invoice_count,
    COUNT(DISTINCT ex.id) AS expense_count
FROM exchanges e
LEFT JOIN invoices i ON e.id = i.exchange_id
LEFT JOIN expenses ex ON e.id = ex.exchange_id
GROUP BY e.id, e.name, e.exchange_number, e.exchange_value;

-- ============================================
-- USER ACTIVITY VIEWS
-- ============================================

-- User activity dashboard
CREATE OR REPLACE VIEW v_user_activity AS
SELECT 
    u.id,
    u.email,
    u.first_name || ' ' || u.last_name AS full_name,
    u.role,
    -- Exchange assignments
    (SELECT COUNT(*) FROM exchange_participants ep WHERE ep.user_id = u.id) AS assigned_exchanges,
    (SELECT COUNT(*) FROM exchanges e WHERE e.coordinator_id = u.id) AS coordinated_exchanges,
    -- Task assignments
    (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id) AS assigned_tasks,
    (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id AND t.status = 'completed') AS completed_tasks,
    -- Message activity
    (SELECT COUNT(*) FROM messages m WHERE m.sender_id = u.id) AS messages_sent,
    (SELECT MAX(m.created_at) FROM messages m WHERE m.sender_id = u.id) AS last_message_date,
    -- Document uploads
    (SELECT COUNT(*) FROM documents d WHERE d.uploaded_by = u.id) AS documents_uploaded,
    -- Login activity
    u.last_login,
    u.is_active
FROM users u;

-- ============================================
-- DOCUMENT VIEWS
-- ============================================

-- Document summary by exchange
CREATE OR REPLACE VIEW v_document_summary AS
SELECT 
    e.id AS exchange_id,
    e.name AS exchange_name,
    e.exchange_number,
    COUNT(d.id) AS total_documents,
    COUNT(CASE WHEN d.category = 'contract' THEN 1 END) AS contract_documents,
    COUNT(CASE WHEN d.category = 'financial' THEN 1 END) AS financial_documents,
    COUNT(CASE WHEN d.category = 'legal' THEN 1 END) AS legal_documents,
    COUNT(CASE WHEN d.category = 'identification' THEN 1 END) AS identification_documents,
    COUNT(CASE WHEN d.is_pin_protected THEN 1 END) AS protected_documents,
    MAX(d.created_at) AS last_document_date,
    SUM(d.file_size) AS total_storage_bytes
FROM exchanges e
LEFT JOIN documents d ON e.id = d.exchange_id
GROUP BY e.id, e.name, e.exchange_number;

-- ============================================
-- TASK MANAGEMENT VIEWS
-- ============================================

-- Task summary by exchange
CREATE OR REPLACE VIEW v_task_summary AS
SELECT 
    e.id AS exchange_id,
    e.name AS exchange_name,
    e.exchange_number,
    COUNT(t.id) AS total_tasks,
    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) AS completed_tasks,
    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) AS pending_tasks,
    COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) AS in_progress_tasks,
    COUNT(CASE WHEN t.due_date < CURRENT_DATE AND t.status != 'completed' THEN 1 END) AS overdue_tasks,
    MIN(t.due_date) AS next_due_date,
    MAX(t.updated_at) AS last_task_update
FROM exchanges e
LEFT JOIN tasks t ON e.id = t.exchange_id
GROUP BY e.id, e.name, e.exchange_number;

-- ============================================
-- COMPLIANCE VIEWS
-- ============================================

-- Exchange compliance status
CREATE OR REPLACE VIEW v_exchange_compliance AS
SELECT 
    e.id,
    e.name,
    e.exchange_number,
    e.status,
    e.compliance_status,
    e.identification_deadline,
    e.exchange_deadline,
    -- Required document checks
    CASE 
        WHEN EXISTS (SELECT 1 FROM documents d WHERE d.exchange_id = e.id AND d.category = 'identification') 
        THEN 'yes' ELSE 'no' 
    END AS has_identification_docs,
    CASE 
        WHEN EXISTS (SELECT 1 FROM documents d WHERE d.exchange_id = e.id AND d.category = 'contract') 
        THEN 'yes' ELSE 'no' 
    END AS has_contracts,
    CASE 
        WHEN EXISTS (SELECT 1 FROM documents d WHERE d.exchange_id = e.id AND d.category = 'financial') 
        THEN 'yes' ELSE 'no' 
    END AS has_financial_docs,
    -- Timeline compliance
    CASE 
        WHEN e.identification_deadline IS NOT NULL AND e.identification_deadline < CURRENT_DATE 
        THEN 'overdue' 
        WHEN e.identification_deadline IS NOT NULL AND e.identification_deadline <= CURRENT_DATE + INTERVAL '7 days' 
        THEN 'urgent'
        ELSE 'compliant' 
    END AS identification_status,
    CASE 
        WHEN e.exchange_deadline IS NOT NULL AND e.exchange_deadline < CURRENT_DATE 
        THEN 'overdue' 
        WHEN e.exchange_deadline IS NOT NULL AND e.exchange_deadline <= CURRENT_DATE + INTERVAL '7 days' 
        THEN 'urgent'
        ELSE 'compliant' 
    END AS exchange_status
FROM exchanges e
WHERE e.status IN ('active', 'pending');

-- ============================================
-- MESSAGING VIEWS
-- ============================================

-- Message activity by exchange
CREATE OR REPLACE VIEW v_message_activity AS
SELECT 
    e.id AS exchange_id,
    e.name AS exchange_name,
    e.exchange_number,
    COUNT(m.id) AS total_messages,
    COUNT(DISTINCT m.sender_id) AS unique_senders,
    MIN(m.created_at) AS first_message_date,
    MAX(m.created_at) AS last_message_date,
    COUNT(CASE WHEN m.created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) AS messages_last_week,
    COUNT(CASE WHEN m.created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS messages_last_month
FROM exchanges e
LEFT JOIN messages m ON e.id = m.exchange_id
GROUP BY e.id, e.name, e.exchange_number;

-- ============================================
-- ADMINISTRATIVE VIEWS
-- ============================================

-- System usage statistics
CREATE OR REPLACE VIEW v_system_stats AS
SELECT 
    'exchanges' AS entity_type,
    COUNT(*) AS total_count,
    COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS created_last_month
FROM exchanges

UNION ALL

SELECT 
    'users' AS entity_type,
    COUNT(*) AS total_count,
    COUNT(CASE WHEN is_active THEN 1 END) AS active_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS created_last_month
FROM users

UNION ALL

SELECT 
    'contacts' AS entity_type,
    COUNT(*) AS total_count,
    COUNT(CASE WHEN is_active THEN 1 END) AS active_count,
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS created_last_month
FROM contacts

UNION ALL

SELECT 
    'documents' AS entity_type,
    COUNT(*) AS total_count,
    COUNT(*) AS active_count, -- All documents are considered active
    COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) AS created_last_month
FROM documents;

-- ============================================
-- INDEXES FOR VIEWS (if needed for performance)
-- ============================================

-- Note: Most indexes are already created in 02-create-indexes.sql
-- Additional indexes can be added here if specific view queries are slow