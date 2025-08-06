-- COMPLETE PP DATA MIGRATION
-- This SQL adds ALL necessary columns to handle PracticePanther data
-- Run this in your Supabase SQL editor

-- Add all major PP custom fields (high usage > 10%)
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS type_of_exchange VARCHAR(100);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_value DECIMAL(15,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS proceeds DECIMAL(15,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS identified BOOLEAN;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_value DECIMAL(15,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_property_address TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_property_state VARCHAR(10);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_purchase_contract_title TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS buyer_1_name VARCHAR(200);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_property_city VARCHAR(100);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS client_vesting TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS bank VARCHAR(10);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_escrow_number VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_contract_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_property_zip VARCHAR(20);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_apn VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS day_45 DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS day_180 DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS close_of_escrow_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_purchase_contract_title TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_property_address TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_seller_1_name VARCHAR(200);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_city VARCHAR(100);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_state VARCHAR(10);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_escrow_number VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_zip VARCHAR(20);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_purchase_contract_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS buyer_2_name VARCHAR(200);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_seller_2_name VARCHAR(200);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_apn VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS reason_for_cancellation VARCHAR(100);

-- Add main PP fields  
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rate VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS assigned_to_users JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS statute_of_limitation_date TIMESTAMP;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_created_at TIMESTAMP;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_updated_at TIMESTAMP;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_exchanges_type_of_exchange ON exchanges(type_of_exchange);
CREATE INDEX IF NOT EXISTS idx_exchanges_rel_property_state ON exchanges(rel_property_state);
CREATE INDEX IF NOT EXISTS idx_exchanges_bank ON exchanges(bank);
CREATE INDEX IF NOT EXISTS idx_exchanges_day_45 ON exchanges(day_45);
CREATE INDEX IF NOT EXISTS idx_exchanges_day_180 ON exchanges(day_180);
CREATE INDEX IF NOT EXISTS idx_exchanges_close_of_escrow_date ON exchanges(close_of_escrow_date);
CREATE INDEX IF NOT EXISTS idx_exchanges_rel_property_city ON exchanges(rel_property_city);
CREATE INDEX IF NOT EXISTS idx_exchanges_rate ON exchanges(rate);

-- Create a function to extract PP custom field value by label
CREATE OR REPLACE FUNCTION extract_pp_custom_field(pp_data JSONB, field_label TEXT)
RETURNS TEXT AS $$
DECLARE
    custom_field JSONB;
BEGIN
    FOR custom_field IN SELECT jsonb_array_elements(pp_data->'custom_field_values') 
    LOOP
        IF (custom_field->'custom_field_ref'->>'label') = field_label THEN
            RETURN COALESCE(
                custom_field->>'value_string',
                custom_field->>'value_number', 
                custom_field->>'value_boolean',
                custom_field->>'value_date_time'
            );
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;