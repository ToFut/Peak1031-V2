-- Migration: Enhance Exchange Schema with 1031-specific fields
-- Add missing fields to match the comprehensive JSON schema

-- Add new columns to exchanges table
ALTER TABLE exchanges 
ADD COLUMN IF NOT EXISTS relinquished_property_address VARCHAR(500),
ADD COLUMN IF NOT EXISTS relinquished_sale_price DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS relinquished_closing_date DATE,
ADD COLUMN IF NOT EXISTS exchange_coordinator_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS attorney_or_cpa VARCHAR(255),
ADD COLUMN IF NOT EXISTS bank_account_escrow VARCHAR(255),
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS exchange_name VARCHAR(255);

-- Update existing exchanges to set exchange_name from name if not set
UPDATE exchanges 
SET exchange_name = name 
WHERE exchange_name IS NULL;

-- Make exchange_name required for new records
ALTER TABLE exchanges 
ALTER COLUMN exchange_name SET NOT NULL;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_exchanges_relinquished_closing_date ON exchanges(relinquished_closing_date);
CREATE INDEX IF NOT EXISTS idx_exchanges_exchange_coordinator ON exchanges(exchange_coordinator_name);
CREATE INDEX IF NOT EXISTS idx_exchanges_documents ON exchanges USING GIN (documents);

-- Add comments for documentation
COMMENT ON COLUMN exchanges.relinquished_property_address IS 'Address of the relinquished property';
COMMENT ON COLUMN exchanges.relinquished_sale_price IS 'Sale price of the relinquished property';
COMMENT ON COLUMN exchanges.relinquished_closing_date IS 'Closing date of the relinquished property sale';
COMMENT ON COLUMN exchanges.exchange_coordinator_name IS 'Name of the exchange coordinator';
COMMENT ON COLUMN exchanges.attorney_or_cpa IS 'Attorney or CPA handling the exchange';
COMMENT ON COLUMN exchanges.bank_account_escrow IS 'Bank account or escrow information';
COMMENT ON COLUMN exchanges.documents IS 'Array of document URIs related to this exchange';
COMMENT ON COLUMN exchanges.exchange_name IS 'Display name for the exchange'; 