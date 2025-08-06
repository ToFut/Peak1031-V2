-- =============================================================================
-- ENTERPRISE EXCHANGE LIFECYCLE MANAGEMENT MIGRATION
-- =============================================================================
-- Transforms your database to manage thousands of users and transactions
-- with complete 1031 exchange lifecycle automation
-- 
-- Run each section in Supabase SQL Editor
-- =============================================================================

-- -----------------------------------------------------------------------------
-- SECTION 1: ENHANCE EXCHANGES TABLE FOR COMPLETE LIFECYCLE
-- -----------------------------------------------------------------------------

-- Add comprehensive lifecycle tracking to existing exchanges table
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(50) DEFAULT 'INITIATION';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS stage_progress DECIMAL(5,2) DEFAULT 0.00; -- 0-100%
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS estimated_completion_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS actual_start_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS qualification_completed_at TIMESTAMP;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS relinquished_sale_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS identification_deadline DATE; -- Auto: sale + 45 days
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS exchange_deadline DATE; -- Auto: sale + 180 days
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS replacement_property_count INTEGER DEFAULT 0;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS total_replacement_value DECIMAL(15,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS risk_level VARCHAR(10) DEFAULT 'LOW';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS automated_alerts_enabled BOOLEAN DEFAULT true;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS qualified_intermediary_id UUID REFERENCES contacts(id);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS qi_fee DECIMAL(10,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS exchange_fee_total DECIMAL(10,2);

-- Update existing exchanges to have proper lifecycle stages
UPDATE exchanges 
SET lifecycle_stage = CASE 
    WHEN status = 'completed' THEN 'COMPLETION'
    WHEN status = 'active' THEN 'IN_PROGRESS' 
    WHEN status = 'cancelled' THEN 'CANCELLED'
    ELSE 'INITIATION'
END,
actual_start_date = start_date,
stage_progress = CASE
    WHEN status = 'completed' THEN 100.00
    WHEN status = 'active' THEN 50.00
    ELSE 10.00
END
WHERE lifecycle_stage = 'INITIATION';

-- -----------------------------------------------------------------------------
-- SECTION 2: EXCHANGE WORKFLOW HISTORY TRACKING
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS exchange_workflow_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    from_stage VARCHAR(50),
    to_stage VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES contacts(id) ON DELETE SET NULL,
    changed_at TIMESTAMP DEFAULT NOW(),
    reason TEXT,
    automated BOOLEAN DEFAULT false,
    duration_in_stage INTERVAL,
    stage_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_history_exchange ON exchange_workflow_history(exchange_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_workflow_history_stage ON exchange_workflow_history(to_stage, changed_at DESC);

-- -----------------------------------------------------------------------------
-- SECTION 3: FINANCIAL TRANSACTION MANAGEMENT
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL, -- 'RELINQUISHED_SALE', 'REPLACEMENT_PURCHASE', 'QI_DEPOSIT', 'QI_DISBURSEMENT', 'FEE_PAYMENT'
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    transaction_date DATE NOT NULL,
    description TEXT,
    reference_number VARCHAR(100),
    bank_account VARCHAR(255), -- Bank account info
    routing_number VARCHAR(20),
    qualified_intermediary_id UUID REFERENCES contacts(id),
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
    verification_status VARCHAR(20) DEFAULT 'UNVERIFIED', -- UNVERIFIED, VERIFIED, DISPUTED
    source_document_id UUID REFERENCES documents(id),
    created_by UUID REFERENCES contacts(id),
    approved_by UUID REFERENCES contacts(id),
    approved_at TIMESTAMP,
    fees_amount DECIMAL(10,2) DEFAULT 0.00,
    net_amount DECIMAL(15,2), -- Amount minus fees
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_exchange ON financial_transactions(exchange_id);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_type_status ON financial_transactions(transaction_type, status);
CREATE INDEX IF NOT EXISTS idx_financial_transactions_date ON financial_transactions(transaction_date DESC);

-- -----------------------------------------------------------------------------
-- SECTION 4: DETAILED PROPERTY TRACKING
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS exchange_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    property_type VARCHAR(20) NOT NULL, -- 'RELINQUISHED', 'REPLACEMENT'
    property_role VARCHAR(20) NOT NULL, -- 'PRIMARY', 'BACKUP', 'ALTERNATIVE'
    address_full TEXT NOT NULL,
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(10),
    address_zip VARCHAR(20),
    address_country VARCHAR(50) DEFAULT 'USA',
    apn VARCHAR(50), -- Assessor Parcel Number
    legal_description TEXT,
    property_value DECIMAL(15,2),
    purchase_price DECIMAL(15,2),
    sale_price DECIMAL(15,2),
    square_footage INTEGER,
    property_use VARCHAR(50), -- 'RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'LAND'
    zoning VARCHAR(50),
    title_company VARCHAR(255),
    escrow_company VARCHAR(255),
    escrow_number VARCHAR(100),
    closing_date DATE,
    identification_date DATE,
    under_contract_date DATE,
    due_diligence_expiry DATE,
    financing_contingency_date DATE,
    property_status VARCHAR(30) DEFAULT 'ACTIVE', -- ACTIVE, UNDER_CONTRACT, CLOSED, CANCELLED
    compliance_notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exchange_properties_exchange ON exchange_properties(exchange_id);
CREATE INDEX IF NOT EXISTS idx_exchange_properties_type_status ON exchange_properties(property_type, property_status);
CREATE INDEX IF NOT EXISTS idx_exchange_properties_closing_date ON exchange_properties(closing_date) WHERE closing_date IS NOT NULL;

-- -----------------------------------------------------------------------------
-- SECTION 5: DOCUMENT LIFECYCLE REQUIREMENTS
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS document_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lifecycle_stage VARCHAR(50) NOT NULL,
    document_type VARCHAR(100) NOT NULL,
    document_category VARCHAR(50) DEFAULT 'REQUIRED', -- 'REQUIRED', 'OPTIONAL', 'CONDITIONAL'
    description TEXT,
    due_offset_days INTEGER DEFAULT 0, -- Days from stage start when due
    is_required BOOLEAN DEFAULT true,
    template_document_id UUID REFERENCES documents(id),
    compliance_weight DECIMAL(3,2) DEFAULT 1.00,
    automated_generation BOOLEAN DEFAULT false,
    instructions TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert standard 1031 exchange document requirements
INSERT INTO document_requirements (lifecycle_stage, document_type, document_category, description, is_required, due_offset_days) VALUES
('INITIATION', 'EXCHANGE_AGREEMENT', 'REQUIRED', 'Qualified Intermediary Exchange Agreement', true, 0),
('INITIATION', 'PROPERTY_INFORMATION', 'REQUIRED', 'Relinquished Property Details and Valuation', true, 3),
('INITIATION', 'CLIENT_INTAKE_FORM', 'REQUIRED', 'Complete client information and objectives', true, 0),
('QUALIFICATION', 'PROPERTY_APPRAISAL', 'REQUIRED', 'Professional property appraisal', true, 14),
('QUALIFICATION', 'LEGAL_REVIEW', 'REQUIRED', 'Legal review of exchange structure', true, 10),
('DOCUMENTATION', 'PURCHASE_AGREEMENT', 'REQUIRED', 'Relinquished property purchase agreement', true, 0),
('DOCUMENTATION', 'TITLE_COMMITMENT', 'REQUIRED', 'Title insurance commitment', true, 5),
('RELINQUISHED_SALE', 'CLOSING_STATEMENT', 'REQUIRED', 'HUD-1 or Closing Disclosure', true, 0),
('RELINQUISHED_SALE', 'DEED', 'REQUIRED', 'Executed deed transferring property', true, 0),
('IDENTIFICATION_PERIOD', 'IDENTIFICATION_FORM', 'REQUIRED', '45-day identification form', true, 0),
('IDENTIFICATION_PERIOD', 'REPLACEMENT_PROPERTY_INFO', 'REQUIRED', 'Details of identified properties', true, 0),
('REPLACEMENT_ACQUISITION', 'REPLACEMENT_PURCHASE_AGREEMENT', 'REQUIRED', 'Purchase agreement for replacement property', true, 0),
('REPLACEMENT_ACQUISITION', 'REPLACEMENT_TITLE_COMMITMENT', 'REQUIRED', 'Title commitment for replacement property', true, 7),
('COMPLETION', 'FINAL_CLOSING_STATEMENT', 'REQUIRED', 'Final exchange closing statement', true, 0),
('COMPLETION', 'EXCHANGE_COMPLETION_CERTIFICATE', 'REQUIRED', 'QI completion certificate', true, 1)
ON CONFLICT DO NOTHING;

-- Enhance existing documents table for lifecycle management
ALTER TABLE documents ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(50);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS requirement_id UUID REFERENCES document_requirements(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) DEFAULT 'UNREVIEWED';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES contacts(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_overdue BOOLEAN DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS automated_checks JSONB DEFAULT '{}';

-- -----------------------------------------------------------------------------
-- SECTION 6: EXCHANGE MILESTONES & DEADLINES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS exchange_milestones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    milestone_type VARCHAR(50) NOT NULL, -- '45_DAY_DEADLINE', '180_DAY_DEADLINE', 'CLOSING_DATE', 'DOCUMENT_DUE'
    milestone_name VARCHAR(255) NOT NULL,
    due_date DATE NOT NULL,
    alert_offset_days INTEGER DEFAULT 7,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, COMPLETED, MISSED, EXTENDED
    completion_date DATE,
    completion_notes TEXT,
    is_critical BOOLEAN DEFAULT true,
    automated_calculation BOOLEAN DEFAULT false,
    calculation_base_field VARCHAR(50),
    created_by UUID REFERENCES contacts(id),
    completed_by UUID REFERENCES contacts(id),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_exchange ON exchange_milestones(exchange_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due_critical ON exchange_milestones(due_date, is_critical) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_milestones_type ON exchange_milestones(milestone_type);

-- Enhance existing tasks table for lifecycle automation
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS milestone_id UUID REFERENCES exchange_milestones(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_template_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS blocking_tasks UUID[];
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completion_triggers JSONB DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS sla_hours INTEGER;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escalation_level INTEGER DEFAULT 0;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS escalated_to UUID REFERENCES contacts(id);

-- -----------------------------------------------------------------------------
-- SECTION 7: COMPLIANCE & RISK MANAGEMENT
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS compliance_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    check_type VARCHAR(50) NOT NULL, -- 'IRC_1031', 'TIMING', 'VALUE', 'LIKE_KIND', 'DOCUMENTATION'
    check_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PASSED, FAILED, WARNING
    severity VARCHAR(10) DEFAULT 'LOW', -- LOW, MEDIUM, HIGH, CRITICAL
    automated BOOLEAN DEFAULT false,
    check_date TIMESTAMP DEFAULT NOW(),
    details JSONB DEFAULT '{}',
    resolution_notes TEXT,
    resolved_by UUID REFERENCES contacts(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_checks_exchange ON compliance_checks(exchange_id);
CREATE INDEX IF NOT EXISTS idx_compliance_checks_status_severity ON compliance_checks(status, severity);

CREATE TABLE IF NOT EXISTS risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    assessment_date DATE DEFAULT CURRENT_DATE,
    overall_risk_score DECIMAL(5,2), -- 0-100
    timing_risk_score DECIMAL(5,2),
    financial_risk_score DECIMAL(5,2),
    property_risk_score DECIMAL(5,2),
    compliance_risk_score DECIMAL(5,2),
    market_risk_score DECIMAL(5,2),
    risk_factors JSONB DEFAULT '[]',
    mitigation_strategies JSONB DEFAULT '[]',
    assessed_by UUID REFERENCES contacts(id),
    next_assessment_date DATE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_assessments_exchange ON risk_assessments(exchange_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_score ON risk_assessments(overall_risk_score DESC);

-- -----------------------------------------------------------------------------
-- SECTION 8: PERFORMANCE ANALYTICS FOR SCALE
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS exchange_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    calculation_date DATE DEFAULT CURRENT_DATE,
    days_in_current_stage INTEGER,
    total_days_elapsed INTEGER,
    completion_percentage DECIMAL(5,2),
    tasks_completed INTEGER,
    tasks_remaining INTEGER,
    documents_complete INTEGER,
    documents_pending INTEGER,
    compliance_score DECIMAL(5,2),
    on_track BOOLEAN DEFAULT true,
    projected_completion_date DATE,
    budget_variance_percentage DECIMAL(5,2),
    last_updated TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_exchange ON exchange_analytics(exchange_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON exchange_analytics(calculation_date DESC);

-- -----------------------------------------------------------------------------
-- SECTION 9: ENTERPRISE PERFORMANCE INDEXES
-- -----------------------------------------------------------------------------

-- High-performance indexes for thousands of users and transactions
CREATE INDEX IF NOT EXISTS idx_exchanges_lifecycle_status ON exchanges(lifecycle_stage, status);
CREATE INDEX IF NOT EXISTS idx_exchanges_deadlines ON exchanges(identification_deadline, exchange_deadline) WHERE status != 'CLOSED';
CREATE INDEX IF NOT EXISTS idx_exchanges_risk_level ON exchanges(risk_level, compliance_status);
CREATE INDEX IF NOT EXISTS idx_exchanges_coordinator ON exchanges(coordinator_id) WHERE status != 'CLOSED';

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_priority_due ON tasks(assigned_to, priority, due_date) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_documents_exchange_stage_status ON documents(exchange_id, lifecycle_stage, compliance_status);
CREATE INDEX IF NOT EXISTS idx_messages_exchange_recent ON messages(exchange_id, created_at DESC) WHERE is_deleted = false;

-- Partial indexes for active data only
CREATE INDEX IF NOT EXISTS idx_active_exchanges_stage ON exchanges(lifecycle_stage) WHERE status != 'CLOSED';
CREATE INDEX IF NOT EXISTS idx_pending_milestones ON exchange_milestones(due_date, exchange_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_overdue_documents ON documents(due_date, exchange_id) WHERE is_overdue = true;

-- -----------------------------------------------------------------------------
-- SECTION 10: AUTOMATED WORKFLOW FUNCTIONS
-- -----------------------------------------------------------------------------

-- Function to calculate critical deadlines automatically
CREATE OR REPLACE FUNCTION calculate_exchange_deadlines(p_exchange_id UUID, p_sale_date DATE)
RETURNS VOID AS $$
BEGIN
    UPDATE exchanges 
    SET 
        identification_deadline = p_sale_date + INTERVAL '45 days',
        exchange_deadline = p_sale_date + INTERVAL '180 days',
        relinquished_sale_date = p_sale_date
    WHERE id = p_exchange_id;
    
    -- Create milestone records
    INSERT INTO exchange_milestones (exchange_id, milestone_type, milestone_name, due_date, is_critical, automated_calculation)
    VALUES 
    (p_exchange_id, '45_DAY_DEADLINE', '45-Day Identification Deadline', p_sale_date + INTERVAL '45 days', true, true),
    (p_exchange_id, '180_DAY_DEADLINE', '180-Day Exchange Deadline', p_sale_date + INTERVAL '180 days', true, true)
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Function to update compliance status
CREATE OR REPLACE FUNCTION update_compliance_status(p_exchange_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    failed_checks INTEGER;
    warning_checks INTEGER;
    new_status VARCHAR(20);
BEGIN
    SELECT 
        COUNT(*) FILTER (WHERE status = 'FAILED'),
        COUNT(*) FILTER (WHERE status = 'WARNING')
    INTO failed_checks, warning_checks
    FROM compliance_checks 
    WHERE exchange_id = p_exchange_id;
    
    new_status := CASE 
        WHEN failed_checks > 0 THEN 'NON_COMPLIANT'
        WHEN warning_checks > 0 THEN 'AT_RISK'
        ELSE 'COMPLIANT'
    END;
    
    UPDATE exchanges 
    SET compliance_status = new_status
    WHERE id = p_exchange_id;
    
    RETURN new_status;
END;
$$ LANGUAGE plpgsql;

-- Function to advance exchange stages
CREATE OR REPLACE FUNCTION advance_exchange_stage(p_exchange_id UUID, p_new_stage VARCHAR(50), p_changed_by UUID DEFAULT NULL)
RETURNS BOOLEAN AS $$
DECLARE
    old_stage VARCHAR(50);
BEGIN
    SELECT lifecycle_stage INTO old_stage FROM exchanges WHERE id = p_exchange_id;
    
    UPDATE exchanges 
    SET 
        lifecycle_stage = p_new_stage,
        stage_changed_at = NOW(),
        stage_changed_by = p_changed_by
    WHERE id = p_exchange_id;
    
    -- Log the change
    INSERT INTO exchange_workflow_history (exchange_id, from_stage, to_stage, changed_by, automated)
    VALUES (p_exchange_id, old_stage, p_new_stage, p_changed_by, p_changed_by IS NULL);
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- MIGRATION COMPLETE! ENTERPRISE EXCHANGE LIFECYCLE READY
-- =============================================================================
-- 
-- Your database now supports:
-- ✅ Complete 1031 exchange lifecycle management
-- ✅ Automated workflow and deadline tracking
-- ✅ Comprehensive financial transaction management
-- ✅ Document lifecycle with compliance checking
-- ✅ Risk assessment and compliance monitoring
-- ✅ Performance analytics for thousands of users
-- ✅ Enterprise-scale optimization
-- 
-- Next Steps:
-- 1. Test with sample exchange data
-- 2. Configure automated workflows
-- 3. Set up compliance rules
-- 4. Implement frontend integration
-- 5. Configure reporting dashboards
-- 
-- =============================================================================