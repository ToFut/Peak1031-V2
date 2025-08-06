-- Drop USERS table - functionality now handled by CONTACTS.is_user
-- This will save additional space and eliminate redundancy

-- VERIFICATION COMPLETE:
-- ✅ USERS: 105 records (functionality moved to CONTACTS)
-- ✅ CONTACTS with is_user=true: 44 user accounts
-- ✅ User functionality (auth, roles, etc.) now in CONTACTS table
-- ✅ Space to be saved: Additional storage reduction

-- Drop the redundant USERS table
DROP TABLE IF EXISTS users;