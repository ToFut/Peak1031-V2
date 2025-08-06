-- Fix column sizes that are too small for PP data
-- Run this in Supabase SQL editor

-- Increase sizes for columns that are too small
ALTER TABLE exchanges ALTER COLUMN bank TYPE VARCHAR(50);
ALTER TABLE exchanges ALTER COLUMN rel_escrow_number TYPE VARCHAR(100);
ALTER TABLE exchanges ALTER COLUMN rel_apn TYPE VARCHAR(100);
ALTER TABLE exchanges ALTER COLUMN rep_1_escrow_number TYPE VARCHAR(100);
ALTER TABLE exchanges ALTER COLUMN rep_1_apn TYPE VARCHAR(100);
ALTER TABLE exchanges ALTER COLUMN rel_property_zip TYPE VARCHAR(50);
ALTER TABLE exchanges ALTER COLUMN rep_1_zip TYPE VARCHAR(50);
ALTER TABLE exchanges ALTER COLUMN reason_for_cancellation TYPE VARCHAR(200);