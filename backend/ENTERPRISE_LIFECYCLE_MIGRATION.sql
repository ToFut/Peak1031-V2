-- =====================================================
-- ENTERPRISE LIFECYCLE MIGRATION
-- Adds comprehensive enterprise features to existing database
-- Run this AFTER the basic schema is already in place
-- =====================================================

-- =====================================================
-- STEP 1: Add Enterprise Columns to Exchanges Table
-- =====================================================

-- Add lifecycle management columns
ALTER TABLE exchanges 
ADD COLUMN IF NOT EXISTS lifecycle_stage VARCHAR(50) DEFAULT 'INITIATION',
ADD COLUMN IF NOT EXISTS stage_progress INTEGER DEFAULT 0 CHECK (stage_progress >= 0 AND stage_progress <= 100),
ADD COLUMN IF NOT EXISTS days_in_current_stage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS stage_changed_by UUID,
ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS risk_level VARCHAR(50) DEFAULT 'LOW',
ADD COLUMN IF NOT EXISTS on_track BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS total_replacement_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS exchange_value DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
ADD COLUMN IF NOT EXISTS automated_stage_advancement BOOLEAN DEFAULT false;

-- Add constraint for lifecycle stages
ALTER TABLE exchanges 
ADD CONSTRAINT check_lifecycle_stage CHECK (
  lifecycle_stage IN (
    'INITIATION',
    'QUALIFICATION', 
    'DOCUMENTATION',
    'RELINQUISHED_SALE',
    'IDENTIFICATION_PERIOD',
    'REPLACEMENT_ACQUISITION',
    'COMPLETION',
    'CANCELLED'
  )
);

-- Add constraint for compliance status
ALTER TABLE exchanges
ADD CONSTRAINT check_compliance_status CHECK (
  compliance_status IN ('COMPLIANT', 'AT_RISK', 'NON_COMPLIANT', 'PENDING')
);

-- Add constraint for risk level
ALTER TABLE exchanges
ADD CONSTRAINT check_risk_level CHECK (
  risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
);

-- =====================================================
-- STEP 2: Create Exchange Workflow History Table
-- =====================================================

CREATE TABLE IF NOT EXISTS exchange_workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  from_stage VARCHAR(50),
  to_stage VARCHAR(50) NOT NULL,
  changed_by UUID REFERENCES people(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  reason TEXT,
  automated BOOLEAN DEFAULT false,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_history_exchange ON exchange_workflow_history(exchange_id);
CREATE INDEX IF NOT EXISTS idx_workflow_history_date ON exchange_workflow_history(changed_at);

-- =====================================================
-- STEP 3: Create Financial Transactions Table
-- =====================================================

CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  transaction_date DATE NOT NULL,
  settlement_date DATE,
  status VARCHAR(50) DEFAULT 'PENDING',
  party_type VARCHAR(50),
  party_name VARCHAR(255),
  description TEXT,
  reference_number VARCHAR(100),
  created_by UUID REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_trans_exchange ON financial_transactions(exchange_id);
CREATE INDEX IF NOT EXISTS idx_financial_trans_date ON financial_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_financial_trans_status ON financial_transactions(status);

-- =====================================================
-- STEP 4: Create Exchange Milestones Table
-- =====================================================

CREATE TABLE IF NOT EXISTS exchange_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  milestone_name VARCHAR(255) NOT NULL,
  milestone_type VARCHAR(50) NOT NULL,
  due_date DATE NOT NULL,
  completed_date DATE,
  status VARCHAR(50) DEFAULT 'PENDING',
  is_critical BOOLEAN DEFAULT false,
  responsible_party UUID REFERENCES people(id),
  description TEXT,
  dependencies JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_exchange ON exchange_milestones(exchange_id);
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON exchange_milestones(due_date);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON exchange_milestones(status);

-- =====================================================
-- STEP 5: Create Compliance Checks Table
-- =====================================================

CREATE TABLE IF NOT EXISTS compliance_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  check_name VARCHAR(255) NOT NULL,
  check_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  severity VARCHAR(50) DEFAULT 'MEDIUM',
  checked_at TIMESTAMPTZ,
  checked_by UUID REFERENCES people(id),
  details JSONB,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES people(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_exchange ON compliance_checks(exchange_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON compliance_checks(status);
CREATE INDEX IF NOT EXISTS idx_compliance_severity ON compliance_checks(severity);

-- =====================================================
-- STEP 6: Create Risk Assessments Table
-- =====================================================

CREATE TABLE IF NOT EXISTS risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  risk_category VARCHAR(100) NOT NULL,
  risk_level VARCHAR(50) NOT NULL,
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  description TEXT,
  mitigation_strategy TEXT,
  assessed_by UUID REFERENCES people(id),
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  review_date DATE,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_risk_exchange ON risk_assessments(exchange_id);
CREATE INDEX IF NOT EXISTS idx_risk_level ON risk_assessments(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_status ON risk_assessments(status);

-- =====================================================
-- STEP 7: Create Exchange Analytics Table
-- =====================================================

CREATE TABLE IF NOT EXISTS exchange_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  metric_date DATE DEFAULT CURRENT_DATE,
  days_in_current_stage INTEGER DEFAULT 0,
  total_days_elapsed INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  tasks_remaining INTEGER DEFAULT 0,
  documents_uploaded INTEGER DEFAULT 0,
  compliance_score INTEGER DEFAULT 100,
  risk_score INTEGER DEFAULT 0,
  on_track BOOLEAN DEFAULT true,
  projected_completion_date DATE,
  actual_vs_projected_variance INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exchange_id, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_analytics_exchange ON exchange_analytics(exchange_id);
CREATE INDEX IF NOT EXISTS idx_analytics_date ON exchange_analytics(metric_date);

-- =====================================================
-- STEP 8: Create Exchange Properties Table
-- =====================================================

CREATE TABLE IF NOT EXISTS exchange_properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
  property_type VARCHAR(50) NOT NULL, -- 'RELINQUISHED' or 'REPLACEMENT'
  property_address TEXT NOT NULL,
  property_value DECIMAL(15,2),
  acquisition_date DATE,
  sale_date DATE,
  status VARCHAR(50) DEFAULT 'IDENTIFIED',
  escrow_number VARCHAR(100),
  title_company VARCHAR(255),
  property_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_properties_exchange ON exchange_properties(exchange_id);
CREATE INDEX IF NOT EXISTS idx_properties_type ON exchange_properties(property_type);

-- =====================================================
-- STEP 9: Create Stored Procedures for Lifecycle Management
-- =====================================================

-- Function to advance exchange stage
CREATE OR REPLACE FUNCTION advance_exchange_stage(
  p_exchange_id UUID,
  p_new_stage VARCHAR(50),
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_current_stage VARCHAR(50);
  v_success BOOLEAN := false;
BEGIN
  -- Get current stage
  SELECT lifecycle_stage INTO v_current_stage
  FROM exchanges
  WHERE id = p_exchange_id;

  -- Update exchange
  UPDATE exchanges
  SET 
    lifecycle_stage = p_new_stage,
    stage_progress = 0,
    days_in_current_stage = 0,
    stage_changed_at = NOW(),
    stage_changed_by = p_changed_by,
    updated_at = NOW()
  WHERE id = p_exchange_id;

  -- Record in history
  INSERT INTO exchange_workflow_history (
    exchange_id, from_stage, to_stage, changed_by, reason
  ) VALUES (
    p_exchange_id, v_current_stage, p_new_stage, p_changed_by, p_reason
  );

  -- Update analytics
  UPDATE exchange_analytics
  SET 
    days_in_current_stage = 0,
    updated_at = NOW()
  WHERE exchange_id = p_exchange_id 
    AND metric_date = CURRENT_DATE;

  v_success := true;
  RETURN v_success;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate exchange completion percentage
CREATE OR REPLACE FUNCTION calculate_exchange_completion(p_exchange_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_stage VARCHAR(50);
  v_tasks_completed INTEGER;
  v_tasks_total INTEGER;
  v_docs_required INTEGER;
  v_docs_uploaded INTEGER;
  v_base_percentage INTEGER;
  v_task_percentage INTEGER;
  v_doc_percentage INTEGER;
BEGIN
  -- Get current stage
  SELECT lifecycle_stage INTO v_stage
  FROM exchanges WHERE id = p_exchange_id;

  -- Base percentage by stage
  v_base_percentage := CASE v_stage
    WHEN 'INITIATION' THEN 10
    WHEN 'QUALIFICATION' THEN 25
    WHEN 'DOCUMENTATION' THEN 40
    WHEN 'RELINQUISHED_SALE' THEN 55
    WHEN 'IDENTIFICATION_PERIOD' THEN 70
    WHEN 'REPLACEMENT_ACQUISITION' THEN 85
    WHEN 'COMPLETION' THEN 100
    ELSE 0
  END;

  -- Get task completion
  SELECT 
    COUNT(*) FILTER (WHERE status = 'COMPLETED'),
    COUNT(*)
  INTO v_tasks_completed, v_tasks_total
  FROM tasks
  WHERE exchange_id = p_exchange_id;

  -- Get document completion
  SELECT COUNT(*) INTO v_docs_uploaded
  FROM documents
  WHERE exchange_id = p_exchange_id;

  -- Calculate weighted percentage
  v_task_percentage := CASE 
    WHEN v_tasks_total > 0 THEN (v_tasks_completed::FLOAT / v_tasks_total * 10)::INTEGER
    ELSE 0
  END;

  -- Return combined percentage (max 100)
  RETURN LEAST(v_base_percentage + v_task_percentage, 100);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 10: Create Triggers for Automatic Updates
-- =====================================================

-- Trigger to update exchange analytics daily
CREATE OR REPLACE FUNCTION update_exchange_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update analytics record
  INSERT INTO exchange_analytics (
    exchange_id,
    metric_date,
    days_in_current_stage,
    total_days_elapsed,
    tasks_completed,
    tasks_remaining,
    documents_uploaded,
    on_track
  )
  SELECT 
    NEW.id,
    CURRENT_DATE,
    COALESCE(NEW.days_in_current_stage, 0),
    EXTRACT(DAY FROM NOW() - NEW.created_at)::INTEGER,
    (SELECT COUNT(*) FROM tasks WHERE exchange_id = NEW.id AND status = 'COMPLETED'),
    (SELECT COUNT(*) FROM tasks WHERE exchange_id = NEW.id AND status != 'COMPLETED'),
    (SELECT COUNT(*) FROM documents WHERE exchange_id = NEW.id),
    NEW.on_track
  ON CONFLICT (exchange_id, metric_date) 
  DO UPDATE SET
    days_in_current_stage = EXCLUDED.days_in_current_stage,
    total_days_elapsed = EXCLUDED.total_days_elapsed,
    tasks_completed = EXCLUDED.tasks_completed,
    tasks_remaining = EXCLUDED.tasks_remaining,
    documents_uploaded = EXCLUDED.documents_uploaded,
    on_track = EXCLUDED.on_track,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_exchange_analytics
AFTER INSERT OR UPDATE ON exchanges
FOR EACH ROW
EXECUTE FUNCTION update_exchange_analytics();

-- =====================================================
-- STEP 11: Update Existing Data with Default Values
-- =====================================================

-- Set default lifecycle stages for existing exchanges based on status
UPDATE exchanges 
SET lifecycle_stage = CASE
  WHEN status = 'completed' THEN 'COMPLETION'
  WHEN status = 'active' AND identification_deadline > CURRENT_DATE THEN 'IDENTIFICATION_PERIOD'
  WHEN status = 'active' AND exchange_deadline > CURRENT_DATE THEN 'REPLACEMENT_ACQUISITION'
  WHEN status = 'pending' THEN 'INITIATION'
  ELSE 'QUALIFICATION'
END
WHERE lifecycle_stage IS NULL;

-- Set default compliance status
UPDATE exchanges 
SET compliance_status = 'PENDING'
WHERE compliance_status IS NULL;

-- Set default risk level
UPDATE exchanges 
SET risk_level = 'LOW'
WHERE risk_level IS NULL;

-- Calculate initial completion percentages
UPDATE exchanges 
SET completion_percentage = calculate_exchange_completion(id);

-- =====================================================
-- STEP 12: Create Indexes for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_exchanges_lifecycle ON exchanges(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_exchanges_compliance ON exchanges(compliance_status);
CREATE INDEX IF NOT EXISTS idx_exchanges_risk ON exchanges(risk_level);
CREATE INDEX IF NOT EXISTS idx_exchanges_on_track ON exchanges(on_track);
CREATE INDEX IF NOT EXISTS idx_exchanges_dates ON exchanges(identification_deadline, exchange_deadline);

-- =====================================================
-- STEP 13: Grant Permissions
-- =====================================================

-- Grant permissions to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT INSERT, UPDATE ON exchanges, tasks, documents, messages TO authenticated;
GRANT INSERT ON exchange_workflow_history, exchange_analytics TO authenticated;

-- Grant admin full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify migration
DO $$
BEGIN
  RAISE NOTICE 'Enterprise Lifecycle Migration Complete!';
  RAISE NOTICE 'Added lifecycle management to exchanges table';
  RAISE NOTICE 'Created 8 new enterprise tables';
  RAISE NOTICE 'Added stored procedures for lifecycle management';
  RAISE NOTICE 'Set up automatic analytics tracking';
  RAISE NOTICE '';
  RAISE NOTICE 'Admins can now:';
  RAISE NOTICE '- See all exchanges with lifecycle stages';
  RAISE NOTICE '- Track compliance and risk levels';
  RAISE NOTICE '- Monitor financial transactions';
  RAISE NOTICE '- View comprehensive analytics';
  RAISE NOTICE '- Advance exchanges through stages';
END $$;