-- ================================================================
-- ADD NOTES COLUMN - Missing notes field for contacts
-- Run this in Supabase SQL Editor
-- ================================================================

-- Add missing notes column to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS notes TEXT;

SELECT 'SUCCESS: Notes column added to contacts table!' as result;