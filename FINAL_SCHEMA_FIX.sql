-- ================================================================
-- FINAL SCHEMA FIX - Fix remaining column and size issues
-- Run this in Supabase SQL Editor to fix all remaining issues
-- ================================================================

-- Add missing pp_email column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_email VARCHAR(255);

-- Fix phone number field sizes (they're too small for real phone numbers)
ALTER TABLE contacts ALTER COLUMN phone_primary TYPE VARCHAR(50);
ALTER TABLE contacts ALTER COLUMN phone_mobile TYPE VARCHAR(50);
ALTER TABLE contacts ALTER COLUMN phone_work TYPE VARCHAR(50);
ALTER TABLE contacts ALTER COLUMN phone_home TYPE VARCHAR(50);
ALTER TABLE contacts ALTER COLUMN phone_fax TYPE VARCHAR(50);

-- Also fix users phone fields if they exist
ALTER TABLE users ALTER COLUMN phone_primary TYPE VARCHAR(50);
ALTER TABLE users ALTER COLUMN phone_mobile TYPE VARCHAR(50);
ALTER TABLE users ALTER COLUMN phone_work TYPE VARCHAR(50);
ALTER TABLE users ALTER COLUMN phone_home TYPE VARCHAR(50);

SELECT 'SUCCESS: Final schema fixes applied - added pp_email and expanded phone fields!' as result;