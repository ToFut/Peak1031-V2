-- ================================================================
-- ADD ALL MISSING PP COLUMNS - Based on actual PP field names
-- Run this in Supabase SQL Editor
-- ================================================================

-- Add ALL missing PP columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_first_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_last_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_display_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS pp_is_active BOOLEAN;

-- The contacts table should have these from our previous additions, but let's ensure they exist
-- (These were already added in FINAL_PP_COLUMNS.sql but let's be safe)

-- Verify all PP columns exist for contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_first_name VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_last_name VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_display_name VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS pp_is_primary_contact BOOLEAN;

-- Verify all PP columns exist for exchanges
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_display_name TEXT;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_name TEXT;

-- Verify all PP columns exist for tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS pp_subject VARCHAR(255);

-- Verify all PP columns exist for invoices (should exist from previous additions)

-- Verify all PP columns exist for expenses  
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS pp_description TEXT;

SELECT 'SUCCESS: All missing PP columns added based on actual PP field structure!' as result;