-- ========================================
-- ADD MISSING COLUMNS TO EXCHANGES TABLE (FIXED)
-- Run this in Supabase SQL Editor
-- ========================================

-- Timeline columns for 1031 exchanges (CRITICAL)
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS sale_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS identification_deadline DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS exchange_deadline DATE;

-- Financial columns
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS relinquished_property_value DECIMAL(15,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS replacement_property_value DECIMAL(15,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS cash_boot DECIMAL(12,2) DEFAULT 0;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS financing_amount DECIMAL(15,2);

-- Status columns
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS substatus VARCHAR(100);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS risk_level VARCHAR(20) DEFAULT 'medium';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS completion_percentage INTEGER DEFAULT 0;

-- Chat system (IMPORTANT)
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS exchange_chat_id UUID DEFAULT gen_random_uuid();
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN DEFAULT true;

-- Properties
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS relinquished_properties JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS replacement_properties JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS property_types TEXT[] DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS property_locations JSONB DEFAULT '{}';

-- Compliance
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS compliance_checklist JSONB DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS regulatory_requirements JSONB DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(50) DEFAULT 'pending';

-- Analytics
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS estimated_fees DECIMAL(12,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS actual_fees DECIMAL(12,2);

-- PracticePanther Integration Fields
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_account_ref_id VARCHAR(36);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_account_ref_display_name TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_number INTEGER;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_display_name TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_name TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_notes TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_rate VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_open_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_close_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_statute_of_limitation_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_tags TEXT[] DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_status VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_assigned_to_users JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_practice_area VARCHAR(100);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_matter_type VARCHAR(100);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_billing_info JSONB DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_custom_field_values JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_created_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_updated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_synced_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_raw_data JSONB DEFAULT '{}';

-- Add simple computed column for exchange_value (immutable - only depends on table columns)
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS exchange_value DECIMAL(15,2) 
GENERATED ALWAYS AS (
    COALESCE(relinquished_property_value, 0) + COALESCE(replacement_property_value, 0)
) STORED;

-- Add simple computed column for profitability (immutable - only depends on table columns)
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS profitability DECIMAL(12,2) 
GENERATED ALWAYS AS (
    COALESCE(actual_fees, 0) - COALESCE(estimated_fees, 0)
) STORED;

-- Create unique index for exchange_chat_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchanges_chat_id_unique ON exchanges(exchange_chat_id) WHERE exchange_chat_id IS NOT NULL;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_exchanges_deadlines ON exchanges(identification_deadline, exchange_deadline) WHERE identification_deadline IS NOT NULL OR exchange_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exchanges_timeline ON exchanges(sale_date, identification_deadline, exchange_deadline);

-- Create a function to calculate days_remaining (since we can't use CURRENT_DATE in generated column)
CREATE OR REPLACE FUNCTION get_days_remaining(deadline_date DATE)
RETURNS INTEGER
LANGUAGE SQL
STABLE
AS $$
    SELECT CASE 
        WHEN deadline_date IS NULL THEN NULL
        ELSE deadline_date - CURRENT_DATE
    END;
$$;

-- Create a view for exchanges with computed days_remaining
CREATE OR REPLACE VIEW exchanges_with_days_remaining AS
SELECT *,
    get_days_remaining(exchange_deadline) as days_remaining
FROM exchanges;

-- Success message
SELECT 'SUCCESS: All missing columns have been added to exchanges table!' as result;