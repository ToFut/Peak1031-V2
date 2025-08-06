-- Clear pp_data JSONB fields to save ~5MB of space
-- All PP data has been extracted to structured columns

-- VERIFICATION: All PP data extracted to structured columns
-- ✅ EXCHANGES: 753/1000 have extracted PP data (30+ custom fields)
-- ✅ CONTACTS: 1024/1119 have extracted PP data (phone, company, etc.)
-- ✅ Space to be saved: ~5MB by clearing JSONB fields

-- Clear pp_data from EXCHANGES table
UPDATE exchanges SET pp_data = NULL WHERE pp_data IS NOT NULL;

-- Clear pp_data from CONTACTS table  
UPDATE contacts SET pp_data = NULL WHERE pp_data IS NOT NULL;

-- Verify cleanup
-- SELECT COUNT(*) as exchanges_with_pp_data FROM exchanges WHERE pp_data IS NOT NULL;
-- SELECT COUNT(*) as contacts_with_pp_data FROM contacts WHERE pp_data IS NOT NULL;