-- ========================================
-- ADD MISSING COLUMNS TO EXCHANGES TABLE
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

-- Add computed columns
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS exchange_value DECIMAL(15,2) 
GENERATED ALWAYS AS (
    COALESCE(relinquished_property_value, 0) + COALESCE(replacement_property_value, 0)
) STORED;

ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS days_remaining INTEGER 
GENERATED ALWAYS AS (
    CASE 
        WHEN exchange_deadline IS NULL THEN NULL
        ELSE exchange_deadline - CURRENT_DATE
    END
) STORED;

ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS profitability DECIMAL(12,2) 
GENERATED ALWAYS AS (
    COALESCE(actual_fees, 0) - COALESCE(estimated_fees, 0)
) STORED;

-- Create unique index for exchange_chat_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_exchanges_chat_id_unique ON exchanges(exchange_chat_id) WHERE exchange_chat_id IS NOT NULL;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_exchanges_deadlines ON exchanges(identification_deadline, exchange_deadline) WHERE identification_deadline IS NOT NULL OR exchange_deadline IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_exchanges_timeline ON exchanges(sale_date, identification_deadline, exchange_deadline);

-- Success message
SELECT 'SUCCESS: All missing columns have been added to exchanges table!' as result;