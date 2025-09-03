-- Migration: Add missing PracticePanther columns for complete data display
-- Date: 2025-09-02
-- Purpose: Add columns to display all PP custom field data on frontend

BEGIN;

-- Add missing PP field columns to exchanges table
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS settlement_agent TEXT; -- Settlement agent for relinquished property
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS property_type TEXT; -- Type of relinquished property (Residential, Commercial, etc.)
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_seller_name TEXT; -- Combined seller names for replacement property
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS expected_closing TIMESTAMP; -- Expected closing date
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS exchange_agreement_drafted TIMESTAMP; -- Date exchange agreement was drafted
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS date_proceeds_received TIMESTAMP; -- Date proceeds were received
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS internal_credit_to TEXT; -- Internal credit assignment
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_account_name TEXT; -- PracticePanther account name
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_account_id TEXT; -- PracticePanther account GUID
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_matter_guid TEXT; -- PracticePanther matter GUID
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_responsible_attorney_email TEXT; -- Responsible attorney email
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS referral_source TEXT; -- Referral source name
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS referral_source_email TEXT; -- Referral source email

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_exchanges_pp_matter_guid ON exchanges(pp_matter_guid);
CREATE INDEX IF NOT EXISTS idx_exchanges_pp_account_id ON exchanges(pp_account_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_referral_source ON exchanges(referral_source);

-- Add comments for documentation
COMMENT ON COLUMN exchanges.settlement_agent IS 'Settlement agent for relinquished property from PracticePanther';
COMMENT ON COLUMN exchanges.property_type IS 'Type of relinquished property (Residential, Commercial, etc.) from PracticePanther';
COMMENT ON COLUMN exchanges.rep_1_seller_name IS 'Combined seller names for replacement property from PracticePanther';
COMMENT ON COLUMN exchanges.expected_closing IS 'Expected closing date from PracticePanther';
COMMENT ON COLUMN exchanges.exchange_agreement_drafted IS 'Date exchange agreement was drafted from PracticePanther';
COMMENT ON COLUMN exchanges.date_proceeds_received IS 'Date proceeds were received from PracticePanther';
COMMENT ON COLUMN exchanges.internal_credit_to IS 'Internal credit assignment from PracticePanther';
COMMENT ON COLUMN exchanges.pp_account_name IS 'PracticePanther account name';
COMMENT ON COLUMN exchanges.pp_account_id IS 'PracticePanther account GUID';
COMMENT ON COLUMN exchanges.pp_matter_guid IS 'PracticePanther matter GUID (different from pp_matter_id which is the number)';
COMMENT ON COLUMN exchanges.pp_responsible_attorney_email IS 'Responsible attorney email from PracticePanther';
COMMENT ON COLUMN exchanges.referral_source IS 'Referral source name from PracticePanther';
COMMENT ON COLUMN exchanges.referral_source_email IS 'Referral source email from PracticePanther';

COMMIT;