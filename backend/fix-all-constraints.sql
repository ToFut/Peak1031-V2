-- Fix all unique constraints that are causing issues with PP import
-- PracticePanther data often has duplicates that we need to handle

-- 1. Drop the unique constraint on email
ALTER TABLE people DROP CONSTRAINT IF EXISTS people_email_key;

-- 2. Drop the unique constraint on pp_contact_id
ALTER TABLE people DROP CONSTRAINT IF EXISTS people_pp_contact_id_key;

-- 3. Create non-unique indexes for performance
DROP INDEX IF EXISTS idx_people_email;
DROP INDEX IF EXISTS idx_people_pp_contact_id;
DROP INDEX IF EXISTS idx_people_email_non_unique;
DROP INDEX IF EXISTS idx_people_pp_contact_id_non_unique;

CREATE INDEX IF NOT EXISTS idx_people_email_non_unique ON people(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_pp_contact_id_non_unique ON people(pp_contact_id) WHERE pp_contact_id IS NOT NULL;

-- 4. Show current constraints
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'people'::regclass;

-- 5. Show import progress
SELECT 
    COUNT(*) as total_contacts,
    COUNT(DISTINCT email) as unique_emails,
    COUNT(DISTINCT pp_contact_id) as unique_pp_ids,
    COUNT(*) FILTER (WHERE pp_contact_id IS NOT NULL) as pp_contacts,
    COUNT(*) FILTER (WHERE source = 'practice_partner') as from_pp
FROM people;