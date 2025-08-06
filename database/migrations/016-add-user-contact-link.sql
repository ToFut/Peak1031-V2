-- Migration: Add User-Contact Link
-- Purpose: Link USERS to CONTACTS to fix client access to exchanges
-- Date: Created by system

-- Step 1: Add contact_id to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES contacts(id);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_contact_id ON users(contact_id);

-- Step 3: Link existing users to contacts by email match
-- Only link client users to contacts (not admins/coordinators)
UPDATE users u
SET contact_id = c.id
FROM contacts c
WHERE LOWER(u.email) = LOWER(c.email)
  AND u.contact_id IS NULL
  AND u.role IN ('client', 'third_party', 'agency')
  AND c.email IS NOT NULL
  AND c.email != '';

-- Step 4: Create function to get user's accessible exchanges
CREATE OR REPLACE FUNCTION get_user_exchanges(p_user_id UUID)
RETURNS TABLE (
    exchange_id UUID,
    exchange_name TEXT,
    status TEXT,
    priority TEXT,
    role TEXT,
    client_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        e.id,
        COALESCE(e.name, e.exchange_name)::TEXT,
        e.status::TEXT,
        e.priority::TEXT,
        CASE
            WHEN e.coordinator_id = p_user_id THEN 'coordinator'
            WHEN c.id IS NOT NULL AND e.client_id = c.id THEN 'client'
            WHEN ep.user_id = p_user_id THEN COALESCE(ep.role, 'participant')
            WHEN c.id IS NOT NULL AND ep.contact_id = c.id THEN COALESCE(ep.role, 'participant')
            ELSE 'viewer'
        END as role,
        COALESCE(client_contact.first_name || ' ' || client_contact.last_name, 'Unknown')::TEXT as client_name
    FROM exchanges e
    LEFT JOIN users u ON u.id = p_user_id
    LEFT JOIN contacts c ON u.contact_id = c.id
    LEFT JOIN contacts client_contact ON e.client_id = client_contact.id
    LEFT JOIN exchange_participants ep ON ep.exchange_id = e.id
    WHERE 
        -- User is coordinator
        e.coordinator_id = p_user_id
        -- OR user is client (through their linked contact)
        OR (c.id IS NOT NULL AND e.client_id = c.id)
        -- OR user is participant directly
        OR ep.user_id = p_user_id
        -- OR user's contact is participant
        OR (c.id IS NOT NULL AND ep.contact_id = c.id)
        -- OR admin sees all
        OR EXISTS (SELECT 1 FROM users WHERE id = p_user_id AND role = 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create function to ensure new client users get linked to contacts
CREATE OR REPLACE FUNCTION link_user_to_contact_on_create()
RETURNS TRIGGER AS $$
BEGIN
    -- Only for client-type roles
    IF NEW.role IN ('client', 'third_party', 'agency') AND NEW.contact_id IS NULL THEN
        -- Try to find matching contact by email
        SELECT id INTO NEW.contact_id
        FROM contacts
        WHERE LOWER(email) = LOWER(NEW.email)
        LIMIT 1;
        
        -- If no contact exists and this is a client, create one
        IF NEW.contact_id IS NULL AND NEW.role = 'client' THEN
            INSERT INTO contacts (
                email, first_name, last_name, phone
            ) VALUES (
                NEW.email, NEW.first_name, NEW.last_name, NEW.phone
            ) RETURNING id INTO NEW.contact_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for automatic linking
DROP TRIGGER IF EXISTS trigger_link_user_to_contact ON users;
CREATE TRIGGER trigger_link_user_to_contact
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION link_user_to_contact_on_create();

-- Step 7: Create view for easy user+contact data access
CREATE OR REPLACE VIEW user_contact_info AS
SELECT 
    u.id as user_id,
    u.email as user_email,
    u.role,
    u.is_active,
    u.last_login,
    c.id as contact_id,
    COALESCE(c.first_name, u.first_name) as first_name,
    COALESCE(c.last_name, u.last_name) as last_name,
    COALESCE(c.phone, u.phone) as phone,
    c.company,
    c.address,
    c.pp_contact_id
FROM users u
LEFT JOIN contacts c ON u.contact_id = c.id;

-- Step 8: Update RLS policies for better access control
-- Allow users to see their linked contact
CREATE POLICY "Users can view their linked contact" ON contacts
    FOR SELECT
    USING (
        id IN (
            SELECT contact_id FROM users WHERE id = auth.uid() AND contact_id IS NOT NULL
        )
    );

-- Step 9: Create helper function to sync user-contact data
CREATE OR REPLACE FUNCTION sync_user_contact_data(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_contact_id UUID;
    v_user_data RECORD;
    v_contact_data RECORD;
BEGIN
    -- Get user and contact data
    SELECT u.*, c.id as contact_id
    INTO v_user_data
    FROM users u
    LEFT JOIN contacts c ON u.contact_id = c.id
    WHERE u.id = p_user_id;
    
    IF v_user_data.contact_id IS NOT NULL THEN
        -- Update contact with any missing data from user
        UPDATE contacts
        SET 
            first_name = COALESCE(first_name, v_user_data.first_name),
            last_name = COALESCE(last_name, v_user_data.last_name),
            phone = COALESCE(phone, v_user_data.phone),
            email = COALESCE(email, v_user_data.email),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_user_data.contact_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Add comments
COMMENT ON COLUMN users.contact_id IS 'Links user account to contact record for business data access';
COMMENT ON FUNCTION get_user_exchanges IS 'Returns all exchanges accessible to a user based on their role and relationships';
COMMENT ON VIEW user_contact_info IS 'Combined view of user authentication and contact business data';

-- Step 11: Log the migration
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
        'migration', '016-add-user-contact-link',
        'description', 'Added contact_id to users table to fix client access',
        'changes', ARRAY[
            'Added contact_id foreign key to users table',
            'Linked existing users to contacts by email',
            'Created get_user_exchanges function',
            'Added automatic linking trigger',
            'Created user_contact_info view',
            'Updated RLS policies'
        ]
    ),
    NOW()
);