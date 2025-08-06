-- Migration to add all PP data columns to exchanges table
-- Generated on 2025-08-05T23:54:47.295Z

-- Add main PP fields
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rate VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS assigned_to_users JSONB DEFAULT '[]';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS statute_of_limitation_date TIMESTAMP;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_created_at TIMESTAMP;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_updated_at TIMESTAMP;

-- Add custom PP fields  
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS bank VARCHAR(10);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_property_city VARCHAR(100);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_property_state VARCHAR(10);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_property_zip VARCHAR(20);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_property_address TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_apn VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_escrow_number VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_value DECIMAL(15,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rel_contract_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS close_of_escrow_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS day_45 DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS day_180 DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS proceeds DECIMAL(15,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS client_vesting TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS type_of_exchange VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS buyer_1_name VARCHAR(200);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS buyer_2_name VARCHAR(200);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_city VARCHAR(100);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_state VARCHAR(10);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_zip VARCHAR(20);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_property_address TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_apn VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_escrow_number VARCHAR(50);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_value DECIMAL(15,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_contract_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS rep_1_seller_name TEXT;

-- Add indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS idx_exchanges_rate ON exchanges(rate);
CREATE INDEX IF NOT EXISTS idx_exchanges_rel_property_state ON exchanges(rel_property_state);
CREATE INDEX IF NOT EXISTS idx_exchanges_type_of_exchange ON exchanges(type_of_exchange);
CREATE INDEX IF NOT EXISTS idx_exchanges_day_45 ON exchanges(day_45);
CREATE INDEX IF NOT EXISTS idx_exchanges_day_180 ON exchanges(day_180);
CREATE INDEX IF NOT EXISTS idx_exchanges_close_of_escrow_date ON exchanges(close_of_escrow_date);

-- Update trigger to handle new columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
