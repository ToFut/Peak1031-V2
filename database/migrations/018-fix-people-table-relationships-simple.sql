-- Migration: Fix People Table Relationships (Simplified)
-- Purpose: Properly link users and contacts within the unified people table
-- Date: Created by system

-- Step 1: Add self-referential contact_link_id to link users to their contact records
ALTER TABLE people 
ADD COLUMN IF NOT EXISTS contact_link_id UUID REFERENCES people(id);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_people_contact_link_id ON people(contact_link_id);

-- Step 3: Add comment
COMMENT ON COLUMN people.contact_link_id IS 'Links user records (is_user=true) to their corresponding contact record (is_user=false)';

-- Step 4: Link existing user records to contact records by email
UPDATE people u
SET contact_link_id = c.id
FROM people c
WHERE u.is_user = true
  AND c.is_user = false
  AND u.contact_link_id IS NULL
  AND LOWER(u.email) = LOWER(c.email)
  AND u.role IN ('client', 'third_party', 'agency');

-- Step 5: Create function to get user's accessible exchanges
CREATE OR REPLACE FUNCTION get_user_exchanges(p_user_id UUID)
RETURNS TABLE (
    exchange_id UUID,
    exchange_name TEXT,
    status TEXT,
    priority TEXT,
    role TEXT,
    client_name TEXT
) AS $$
DECLARE
    v_user RECORD;
    v_contact_id UUID;
BEGIN
    -- Get user record
    SELECT * INTO v_user
    FROM people
    WHERE id = p_user_id AND is_user = true;
    
    -- Get linked contact ID
    v_contact_id := v_user.contact_link_id;
    
    RETURN QUERY
    SELECT DISTINCT
        e.id,
        COALESCE(e.name, e.exchange_name)::TEXT,
        e.status::TEXT,
        e.priority::TEXT,
        CASE
            WHEN e.coordinator_id = p_user_id THEN 'coordinator'
            WHEN e.client_id = p_user_id THEN 'client'
            WHEN e.client_id = v_contact_id THEN 'client'
            WHEN ep.user_id = p_user_id THEN COALESCE(ep.role, 'participant')
            WHEN ep.contact_id = v_contact_id THEN COALESCE(ep.role, 'participant')
            ELSE 'viewer'
        END as role,
        COALESCE(client.first_name || ' ' || client.last_name, 'Unknown')::TEXT as client_name
    FROM exchanges e
    LEFT JOIN people client ON e.client_id = client.id
    LEFT JOIN exchange_participants ep ON ep.exchange_id = e.id
    WHERE 
        -- User is coordinator
        e.coordinator_id = p_user_id
        -- OR user/contact is client
        OR e.client_id = p_user_id
        OR (v_contact_id IS NOT NULL AND e.client_id = v_contact_id)
        -- OR user is participant
        OR ep.user_id = p_user_id
        -- OR linked contact is participant
        OR (v_contact_id IS NOT NULL AND ep.contact_id = v_contact_id)
        -- OR admin sees all
        OR v_user.role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create view for easy access to user data with their linked contact info
CREATE OR REPLACE VIEW user_with_contact_info AS
SELECT 
    u.id as user_id,
    u.email as user_email,
    u.role,
    u.is_active,
    u.last_login,
    u.contact_link_id,
    COALESCE(c.first_name, u.first_name) as first_name,
    COALESCE(c.last_name, u.last_name) as last_name,
    COALESCE(c.phone, u.phone) as phone,
    COALESCE(c.company, u.company) as company,
    c.pp_contact_id,
    c.pp_data
FROM people u
LEFT JOIN people c ON u.contact_link_id = c.id AND c.is_user = false
WHERE u.is_user = true;

-- Step 7: Create function to ensure user-contact consistency
CREATE OR REPLACE FUNCTION ensure_user_contact_link()
RETURNS TRIGGER AS $$
BEGIN
    -- When creating a new user with client role, try to link to existing contact
    IF NEW.is_user = true AND NEW.role IN ('client', 'third_party', 'agency') AND NEW.contact_link_id IS NULL THEN
        -- Check if contact exists with same email
        SELECT id INTO NEW.contact_link_id
        FROM people
        WHERE is_user = false 
        AND LOWER(email) = LOWER(NEW.email)
        LIMIT 1;
        
        -- If no contact exists and this is a client, create one
        IF NEW.contact_link_id IS NULL AND NEW.role = 'client' THEN
            INSERT INTO people (
                email, first_name, last_name, phone, company,
                is_user, role, source
            ) VALUES (
                NEW.email, NEW.first_name, NEW.last_name, NEW.phone, NEW.company,
                false, NULL, 'user_creation'
            ) RETURNING id INTO NEW.contact_link_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for automatic linking
DROP TRIGGER IF EXISTS trigger_ensure_user_contact_link ON people;
CREATE TRIGGER trigger_ensure_user_contact_link
    BEFORE INSERT OR UPDATE ON people
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_contact_link();

-- Step 9: Update RLS policies for better access control
-- Allow users to see their linked contact record
CREATE POLICY "Users can view their linked contact" ON people
    FOR SELECT
    USING (
        id IN (
            SELECT contact_link_id 
            FROM people 
            WHERE id = auth.uid() 
            AND is_user = true 
            AND contact_link_id IS NOT NULL
        )
    );

-- Step 10: Create helper function to sync PracticePanther contact
CREATE OR REPLACE FUNCTION sync_practicepanther_contact(
    p_pp_contact_id VARCHAR(255),
    p_email VARCHAR(255),
    p_first_name VARCHAR(100),
    p_last_name VARCHAR(100),
    p_phone VARCHAR(20),
    p_company VARCHAR(255),
    p_pp_data JSONB
) RETURNS UUID AS $$
DECLARE
    v_contact_id UUID;
    v_user_id UUID;
BEGIN
    -- Try to find existing contact by PP ID or email
    SELECT id INTO v_contact_id
    FROM people
    WHERE is_user = false
    AND (pp_contact_id = p_pp_contact_id
         OR (p_email IS NOT NULL AND LOWER(email) = LOWER(p_email)))
    LIMIT 1;
    
    IF v_contact_id IS NULL THEN
        -- Create new contact
        INSERT INTO people (
            email, first_name, last_name, phone, company,
            pp_contact_id, pp_data, last_sync_at,
            is_user, source
        ) VALUES (
            COALESCE(p_email, p_pp_contact_id || '@practicepanther.sync'),
            p_first_name, p_last_name, p_phone, p_company,
            p_pp_contact_id, p_pp_data, CURRENT_TIMESTAMP,
            false, 'practicepanther'
        ) RETURNING id INTO v_contact_id;
    ELSE
        -- Update existing contact
        UPDATE people
        SET 
            pp_contact_id = p_pp_contact_id,
            pp_data = p_pp_data,
            first_name = COALESCE(p_first_name, first_name),
            last_name = COALESCE(p_last_name, last_name),
            phone = COALESCE(p_phone, phone),
            company = COALESCE(p_company, company),
            last_sync_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_contact_id;
    END IF;
    
    -- Check if there's a user record that should be linked
    IF p_email IS NOT NULL THEN
        UPDATE people
        SET contact_link_id = v_contact_id
        WHERE is_user = true
        AND LOWER(email) = LOWER(p_email)
        AND contact_link_id IS NULL
        AND role IN ('client', 'third_party', 'agency');
    END IF;
    
    RETURN v_contact_id;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Fix exchange relationships
-- Ensure client_id and coordinator_id reference people records correctly
UPDATE exchanges e
SET client_id = p.contact_link_id
FROM people p
WHERE e.client_id = p.id
  AND p.is_user = true
  AND p.contact_link_id IS NOT NULL;

-- Step 12: Add comment about migration
COMMENT ON FUNCTION get_user_exchanges IS 'Returns all exchanges accessible to a user based on their role and linked contact';

-- Migration complete!
-- Next steps:
-- 1. Run the linking script to connect existing user/contact records
-- 2. Test client login to verify they can see their exchanges
-- 3. Update backend code to use contact_link_id