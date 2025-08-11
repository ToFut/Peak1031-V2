-- ================================================================
-- WORKAROUND PHONE FIX - Handle views blocking column alterations
-- Run this in Supabase SQL Editor
-- ================================================================

-- Add missing pp_email column to users table (this should work)
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_email VARCHAR(255);

-- Instead of altering phone columns, let's add new temp columns with correct size
-- and update the sync script to use these

-- Add new phone columns with proper size for contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_primary_new VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_mobile_new VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_work_new VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_home_new VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS phone_fax_new VARCHAR(50);

-- Copy existing data to new columns (if any exists)
UPDATE contacts SET 
  phone_primary_new = phone_primary,
  phone_mobile_new = phone_mobile,
  phone_work_new = phone_work,
  phone_home_new = phone_home,
  phone_fax_new = phone_fax
WHERE phone_primary IS NOT NULL OR phone_mobile IS NOT NULL OR 
      phone_work IS NOT NULL OR phone_home IS NOT NULL OR phone_fax IS NOT NULL;

-- Add new phone columns with proper size for users  
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_primary_new VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_mobile_new VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_work_new VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_home_new VARCHAR(50);

-- Copy existing data to new columns (if any exists)
UPDATE users SET 
  phone_primary_new = phone_primary,
  phone_mobile_new = phone_mobile,
  phone_work_new = phone_work,
  phone_home_new = phone_home
WHERE phone_primary IS NOT NULL OR phone_mobile IS NOT NULL OR 
      phone_work IS NOT NULL OR phone_home IS NOT NULL;

SELECT 'SUCCESS: Workaround phone fix applied - added _new columns with proper size!' as result;