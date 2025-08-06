-- Fix column sizes for contacts table that are too small for PP data
-- Run this in Supabase SQL editor

-- Increase sizes for columns that are causing errors
ALTER TABLE contacts ALTER COLUMN phone TYPE VARCHAR(50);
ALTER TABLE contacts ALTER COLUMN phone_mobile TYPE VARCHAR(50);
ALTER TABLE contacts ALTER COLUMN phone_work TYPE VARCHAR(50);
ALTER TABLE contacts ALTER COLUMN phone_home TYPE VARCHAR(50);
ALTER TABLE contacts ALTER COLUMN phone_fax TYPE VARCHAR(50);
ALTER TABLE contacts ALTER COLUMN contact_type TYPE VARCHAR(100);
ALTER TABLE contacts ALTER COLUMN display_name TYPE TEXT;
ALTER TABLE contacts ALTER COLUMN account_ref_name TYPE TEXT;
ALTER TABLE contacts ALTER COLUMN address_zip_code TYPE VARCHAR(50);