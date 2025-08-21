-- Add missing ip_changed column to login_audits table
-- This fixes the schema cache error when the security audit service tries to access this column

ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS ip_changed BOOLEAN DEFAULT false;
ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS previous_ip VARCHAR(45);
ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS risk_score INTEGER DEFAULT 0;
ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS risk_factors JSONB;
ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS event_type VARCHAR(50) DEFAULT 'login';
ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS location_data JSONB;
ALTER TABLE login_audits ADD COLUMN IF NOT EXISTS session_id VARCHAR(255);

-- Add index for the new column
CREATE INDEX IF NOT EXISTS idx_login_audits_ip_changed ON login_audits(ip_changed);
CREATE INDEX IF NOT EXISTS idx_login_audits_event_type ON login_audits(event_type);
CREATE INDEX IF NOT EXISTS idx_login_audits_risk_score ON login_audits(risk_score);


