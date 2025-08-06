-- =====================================================
-- QUICK ENTERPRISE COLUMNS ADDITION
-- Run this in Supabase SQL Editor to add enterprise features
-- =====================================================

-- Add enterprise columns to exchanges table
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
ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

-- Update existing exchanges with proper lifecycle stages
UPDATE exchanges 
SET 
  lifecycle_stage = CASE
    WHEN status = 'completed' THEN 'COMPLETION'
    WHEN status = 'active' THEN 'IDENTIFICATION_PERIOD'
    WHEN status = 'pending' THEN 'INITIATION'
    ELSE 'QUALIFICATION'
  END,
  completion_percentage = CASE
    WHEN status = 'completed' THEN 100
    WHEN status = 'active' THEN 50
    ELSE 10
  END
WHERE lifecycle_stage IS NULL OR lifecycle_stage = 'INITIATION';

-- Create a simple view for admin to see all exchanges
CREATE OR REPLACE VIEW admin_all_exchanges AS
SELECT 
  e.*,
  COUNT(DISTINCT ep.id) as participant_count,
  COUNT(DISTINCT t.id) as task_count,
  COUNT(DISTINCT d.id) as document_count,
  COUNT(DISTINCT m.id) as message_count
FROM exchanges e
LEFT JOIN exchange_participants ep ON e.id = ep.exchange_id
LEFT JOIN tasks t ON e.id = t.exchange_id
LEFT JOIN documents d ON e.id = d.exchange_id
LEFT JOIN messages m ON e.id = m.exchange_id
GROUP BY e.id;

-- Grant access to authenticated users
GRANT SELECT ON admin_all_exchanges TO authenticated;

-- Quick verification
SELECT 
  'Enterprise columns added successfully!' as status,
  COUNT(*) as total_exchanges,
  COUNT(DISTINCT lifecycle_stage) as unique_stages,
  COUNT(DISTINCT compliance_status) as compliance_statuses,
  COUNT(DISTINCT risk_level) as risk_levels
FROM exchanges;