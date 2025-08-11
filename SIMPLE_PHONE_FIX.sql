-- ================================================================
-- SIMPLE PHONE FIX - Just add missing columns with correct size
-- Run this in Supabase SQL Editor
-- ================================================================

-- Add missing pp_email column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_email VARCHAR(255);

-- Add phone columns with proper size for contacts (using _new suffix to avoid view conflicts)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_primary_new VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_mobile_new VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_work_new VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_home_new VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_fax_new VARCHAR(50);

-- Add phone columns with proper size for users
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_primary_new VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_mobile_new VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_work_new VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_home_new VARCHAR(50);

SELECT 'SUCCESS: Simple phone fix applied - added missing columns with proper size!' as result;