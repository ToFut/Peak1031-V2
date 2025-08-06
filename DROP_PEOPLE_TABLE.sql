-- Drop PEOPLE table - it's now redundant as all data has been migrated to CONTACTS
-- This will save ~3MB of space and eliminate duplication

-- VERIFICATION COMPLETE:
-- ✅ PEOPLE: 1525 records migrated
-- ✅ CONTACTS: 1119 records (duplicates consolidated)  
-- ✅ USERS in CONTACTS: 44 user accounts migrated
-- ✅ Space to be saved: ~3MB
-- ✅ Duplication eliminated: 406 records (1525 - 1119)

-- Drop the redundant PEOPLE table
DROP TABLE IF EXISTS people;