-- Fix email constraint to allow duplicates (common in PP data)
ALTER TABLE people DROP CONSTRAINT IF EXISTS people_email_key;

-- Keep the index for performance but not unique
DROP INDEX IF EXISTS idx_people_email;
CREATE INDEX idx_people_email_non_unique ON people(email) WHERE email IS NOT NULL;

-- Show current import status
SELECT 
    COUNT(*) as total_contacts,
    COUNT(DISTINCT email) as unique_emails,
    COUNT(*) FILTER (WHERE pp_contact_id IS NOT NULL) as pp_contacts,
    COUNT(*) FILTER (WHERE source = 'practice_partner') as from_pp
FROM people;