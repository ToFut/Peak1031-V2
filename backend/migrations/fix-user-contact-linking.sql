-- Migration: Fix User-Contact Linking and Placeholder Emails
-- Purpose: Link users to contacts and fix @imported.com emails

-- Step 1: Add contact_id to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES people(id);

-- Step 2: Create an index for performance
CREATE INDEX IF NOT EXISTS idx_users_contact_id ON users(contact_id);
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);

-- Step 3: Link users to contacts by email match
UPDATE users u
SET contact_id = p.id
FROM people p
WHERE u.email = p.email
  AND u.email NOT LIKE '%@imported.com%'
  AND u.contact_id IS NULL;

-- Step 4: Link users to contacts by name match
UPDATE users u
SET contact_id = p.id
FROM people p
WHERE LOWER(CONCAT(u.first_name, ' ', u.last_name)) = LOWER(p.full_name)
  AND u.contact_id IS NULL
  AND p.id NOT IN (SELECT contact_id FROM users WHERE contact_id IS NOT NULL);

-- Step 5: Update placeholder emails in people table with real user emails
UPDATE people p
SET email = u.email
FROM users u
WHERE p.id = u.contact_id
  AND p.email LIKE '%@imported.com%'
  AND u.email NOT LIKE '%@imported.com%';

-- Step 6: Create people records for users without contacts (especially clients)
INSERT INTO people (email, full_name, role, is_user, created_at, updated_at)
SELECT 
  u.email,
  CONCAT(u.first_name, ' ', u.last_name),
  u.role,
  true,
  NOW(),
  NOW()
FROM users u
WHERE u.contact_id IS NULL
  AND u.role = 'client'
  AND NOT EXISTS (SELECT 1 FROM people WHERE email = u.email)
ON CONFLICT (email) DO NOTHING;

-- Step 7: Link newly created people records back to users
UPDATE users u
SET contact_id = p.id
FROM people p
WHERE u.email = p.email
  AND u.contact_id IS NULL;

-- Step 8: Create a function to get user's exchanges
CREATE OR REPLACE FUNCTION get_user_exchanges(user_id UUID)
RETURNS TABLE (
  id UUID,
  exchange_name TEXT,
  status TEXT,
  priority TEXT,
  client_id UUID,
  coordinator_id UUID,
  pp_data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    e.id,
    e.exchange_name,
    e.status,
    e.priority,
    e.client_id,
    e.coordinator_id,
    e.pp_data
  FROM exchanges e
  LEFT JOIN users u ON u.id = user_id
  LEFT JOIN people p ON p.id = u.contact_id
  WHERE 
    -- User is coordinator
    e.coordinator_id = user_id
    OR 
    -- User is client (via contact)
    e.client_id = u.contact_id
    OR
    -- User is participant
    EXISTS (
      SELECT 1 FROM exchange_participants ep
      WHERE ep.exchange_id = e.id
        AND (ep.user_id = user_id OR ep.contact_id = u.contact_id)
    );
END;
$$ LANGUAGE plpgsql;

-- Step 9: Grant permissions
GRANT EXECUTE ON FUNCTION get_user_exchanges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_exchanges(UUID) TO anon;

-- Step 10: Add RLS policies for the new relationship
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exchanges" ON exchanges
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT u.id FROM users u
      WHERE u.contact_id = exchanges.client_id
         OR u.id = exchanges.coordinator_id
    )
    OR
    EXISTS (
      SELECT 1 FROM exchange_participants ep
      JOIN users u ON u.id = auth.uid()
      WHERE ep.exchange_id = exchanges.id
        AND (ep.user_id = u.id OR ep.contact_id = u.contact_id)
    )
  );

-- Summary query to check results
SELECT 
  'Users with contacts' as metric,
  COUNT(*) as count
FROM users 
WHERE contact_id IS NOT NULL
UNION ALL
SELECT 
  'Users without contacts' as metric,
  COUNT(*) as count
FROM users 
WHERE contact_id IS NULL
UNION ALL
SELECT 
  'People with placeholder emails' as metric,
  COUNT(*) as count
FROM people
WHERE email LIKE '%@imported.com%';