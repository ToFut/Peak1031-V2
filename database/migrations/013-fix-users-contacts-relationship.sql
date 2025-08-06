-- Migration: Fix Users-Contacts Relationship
-- Purpose: Add contact_id to users table to properly link authentication with business data
-- Date: Created by system

-- Step 1: Add contact_id column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_contact_id ON users(contact_id);

-- Step 3: Add unique constraint to prevent duplicate contact assignments
-- (One contact should only be linked to one user)
ALTER TABLE users 
ADD CONSTRAINT unique_contact_id UNIQUE (contact_id);

-- Step 4: Link existing users to contacts by email match
-- This is a one-time data fix for existing records
UPDATE users u
SET contact_id = c.id
FROM contacts c
WHERE LOWER(u.email) = LOWER(c.email)
  AND u.contact_id IS NULL
  AND c.email IS NOT NULL
  AND c.email != '';

-- Step 5: Create a view for easy user-contact-exchange access
CREATE OR REPLACE VIEW user_exchanges AS
SELECT 
    u.id as user_id,
    u.email as user_email,
    u.role as user_role,
    c.id as contact_id,
    c.first_name,
    c.last_name,
    c.pp_contact_id,
    e.id as exchange_id,
    e.name as exchange_name,
    e.status as exchange_status,
    e.priority as exchange_priority,
    e.client_id,
    e.coordinator_id
FROM users u
LEFT JOIN contacts c ON u.contact_id = c.id
LEFT JOIN exchanges e ON (
    -- User is the client (through contact)
    e.client_id = c.id
    -- OR user is the coordinator
    OR e.coordinator_id = u.id
    -- OR user is a participant
    OR EXISTS (
        SELECT 1 FROM exchange_participants ep
        WHERE ep.exchange_id = e.id
        AND (ep.user_id = u.id OR ep.contact_id = c.id)
    )
)
WHERE u.is_active = true;

-- Step 6: Create function to ensure user-contact consistency
CREATE OR REPLACE FUNCTION ensure_user_contact_consistency()
RETURNS TRIGGER AS $$
BEGIN
    -- When creating a new user with client role, ensure they have a contact
    IF NEW.role = 'client' AND NEW.contact_id IS NULL THEN
        -- Check if contact exists with same email
        SELECT id INTO NEW.contact_id
        FROM contacts
        WHERE LOWER(email) = LOWER(NEW.email)
        LIMIT 1;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for automatic linking
DROP TRIGGER IF EXISTS trigger_ensure_user_contact ON users;
CREATE TRIGGER trigger_ensure_user_contact
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_contact_consistency();

-- Step 8: Add RLS policies for the new relationship
-- Allow users to see their own contact information
CREATE POLICY "Users can view their linked contact" ON contacts
    FOR SELECT
    USING (
        id IN (
            SELECT contact_id FROM users WHERE id = auth.uid()
        )
    );

-- Step 9: Create helper function to get user's exchanges
CREATE OR REPLACE FUNCTION get_user_exchanges(user_id UUID)
RETURNS TABLE (
    exchange_id UUID,
    exchange_name TEXT,
    status TEXT,
    role TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        e.id,
        e.name::TEXT,
        e.status::TEXT,
        CASE
            WHEN e.coordinator_id = user_id THEN 'coordinator'
            WHEN e.client_id = c.id THEN 'client'
            WHEN ep.user_id = user_id THEN ep.role::TEXT
            WHEN ep.contact_id = c.id THEN ep.role::TEXT
            ELSE 'participant'
        END as role
    FROM exchanges e
    LEFT JOIN users u ON u.id = user_id
    LEFT JOIN contacts c ON u.contact_id = c.id
    LEFT JOIN exchange_participants ep ON ep.exchange_id = e.id
    WHERE 
        -- User is coordinator
        e.coordinator_id = user_id
        -- OR user is client (through contact)
        OR (c.id IS NOT NULL AND e.client_id = c.id)
        -- OR user is participant directly
        OR ep.user_id = user_id
        -- OR user's contact is participant
        OR (c.id IS NOT NULL AND ep.contact_id = c.id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 10: Log the migration
INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    details,
    created_at
) VALUES (
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    'MIGRATION_APPLIED',
    'DATABASE',
    jsonb_build_object(
        'migration', '013-fix-users-contacts-relationship',
        'changes', ARRAY[
            'Added contact_id to users table',
            'Linked existing users to contacts by email',
            'Created user_exchanges view',
            'Added consistency triggers',
            'Created helper functions'
        ]
    ),
    NOW()
);

COMMENT ON COLUMN users.contact_id IS 'Links user account to contact record for client data access';
COMMENT ON VIEW user_exchanges IS 'Unified view showing all exchanges accessible to each user';
COMMENT ON FUNCTION get_user_exchanges IS 'Returns all exchanges a user has access to based on their role and relationships';