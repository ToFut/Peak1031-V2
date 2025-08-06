-- Migration: Merge Users and Contacts into People table
-- Purpose: Create a unified people table that combines authentication and contact data
-- Date: Created by system

-- Step 1: Create the new unified people table
CREATE TABLE IF NOT EXISTS people (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Authentication fields (from users)
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'client',
    is_active BOOLEAN DEFAULT true,
    two_fa_enabled BOOLEAN DEFAULT false,
    two_fa_secret VARCHAR(255),
    last_login TIMESTAMP,
    
    -- Personal information (merged from both tables)
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    company VARCHAR(255),
    address TEXT,
    
    -- PracticePanther integration (from contacts)
    pp_contact_id VARCHAR(255) UNIQUE,
    pp_data JSONB,
    last_sync_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_role CHECK (role IN ('admin', 'coordinator', 'client', 'third_party', 'agency')),
    CONSTRAINT chk_has_auth_or_pp CHECK (
        -- Either has password (can login) OR has PP contact ID (synced contact)
        password_hash IS NOT NULL OR pp_contact_id IS NOT NULL
    )
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_people_email ON people(email);
CREATE INDEX idx_people_role ON people(role);
CREATE INDEX idx_people_pp_contact_id ON people(pp_contact_id);
CREATE INDEX idx_people_is_active ON people(is_active);

-- Step 3: Migrate data from users table
INSERT INTO people (
    id, email, password_hash, role, is_active, 
    two_fa_enabled, two_fa_secret, last_login,
    first_name, last_name, phone,
    created_at, updated_at
)
SELECT 
    id, email, password_hash, role, is_active,
    two_fa_enabled, two_fa_secret, last_login,
    first_name, last_name, phone,
    created_at, updated_at
FROM users
ON CONFLICT (email) DO NOTHING;

-- Step 4: Merge contacts data into people
-- For existing users with matching email
UPDATE people p
SET 
    pp_contact_id = c.pp_contact_id,
    pp_data = c.pp_data,
    last_sync_at = c.last_sync_at,
    -- Update personal info if missing
    first_name = COALESCE(p.first_name, c.first_name),
    last_name = COALESCE(p.last_name, c.last_name),
    phone = COALESCE(p.phone, c.phone),
    company = c.company,
    address = c.address,
    updated_at = CURRENT_TIMESTAMP
FROM contacts c
WHERE LOWER(p.email) = LOWER(c.email);

-- Step 5: Insert contacts that don't have user accounts
INSERT INTO people (
    email, role, is_active,
    first_name, last_name, phone, company, address,
    pp_contact_id, pp_data, last_sync_at,
    created_at, updated_at
)
SELECT 
    COALESCE(email, pp_contact_id || '@practicepanther.sync'), -- Generate email if missing
    'client', -- Default role for PP contacts
    true,
    first_name, last_name, phone, company, address,
    pp_contact_id, pp_data, last_sync_at,
    created_at, updated_at
FROM contacts c
WHERE NOT EXISTS (
    SELECT 1 FROM people p 
    WHERE p.pp_contact_id = c.pp_contact_id 
    OR (c.email IS NOT NULL AND LOWER(p.email) = LOWER(c.email))
);

-- Step 6: Create temporary mapping table for ID transitions
CREATE TEMPORARY TABLE id_mapping AS
SELECT 
    'user' as source_type,
    u.id as old_id,
    p.id as new_id
FROM users u
JOIN people p ON u.email = p.email
UNION ALL
SELECT 
    'contact' as source_type,
    c.id as old_id,
    p.id as new_id
FROM contacts c
JOIN people p ON (
    p.pp_contact_id = c.pp_contact_id 
    OR (c.email IS NOT NULL AND LOWER(p.email) = LOWER(c.email))
);

-- Step 7: Update all foreign key references

-- Update exchanges table
ALTER TABLE exchanges ADD COLUMN client_person_id UUID REFERENCES people(id);
ALTER TABLE exchanges ADD COLUMN coordinator_person_id UUID REFERENCES people(id);

UPDATE exchanges e
SET client_person_id = m.new_id
FROM id_mapping m
WHERE m.source_type = 'contact' 
AND m.old_id = e.client_id;

UPDATE exchanges e
SET coordinator_person_id = m.new_id
FROM id_mapping m
WHERE m.source_type = 'user' 
AND m.old_id = e.coordinator_id;

-- Update tasks table
ALTER TABLE tasks ADD COLUMN assigned_to_person_id UUID REFERENCES people(id);
ALTER TABLE tasks ADD COLUMN created_by_person_id UUID REFERENCES people(id);

UPDATE tasks t
SET assigned_to_person_id = m.new_id
FROM id_mapping m
WHERE m.source_type = 'user' 
AND m.old_id = t.assigned_to;

UPDATE tasks t
SET created_by_person_id = m.new_id
FROM id_mapping m
WHERE m.source_type = 'user' 
AND m.old_id = t.created_by;

-- Update documents table
ALTER TABLE documents ADD COLUMN uploaded_by_person_id UUID REFERENCES people(id);

UPDATE documents d
SET uploaded_by_person_id = m.new_id
FROM id_mapping m
WHERE m.source_type = 'user' 
AND m.old_id = d."uploadedBy";

-- Update messages table
ALTER TABLE messages ADD COLUMN sender_person_id UUID REFERENCES people(id);

UPDATE messages msg
SET sender_person_id = m.new_id
FROM id_mapping m
WHERE m.source_type = 'user' 
AND m.old_id = msg.sender_id;

-- Update exchange_participants table
ALTER TABLE exchange_participants ADD COLUMN person_id UUID REFERENCES people(id);

UPDATE exchange_participants ep
SET person_id = m.new_id
FROM id_mapping m
WHERE (m.source_type = 'user' AND m.old_id = ep.user_id)
   OR (m.source_type = 'contact' AND m.old_id = ep.contact_id);

-- Update audit_logs table
ALTER TABLE audit_logs ADD COLUMN person_id UUID REFERENCES people(id);

UPDATE audit_logs al
SET person_id = m.new_id
FROM id_mapping m
WHERE m.source_type = 'user' 
AND m.old_id = al.user_id;

-- Step 8: Create views for backward compatibility (temporary)
CREATE OR REPLACE VIEW users AS
SELECT 
    id, email, password_hash, role, first_name, last_name,
    phone, is_active, two_fa_enabled, two_fa_secret,
    last_login, created_at, updated_at
FROM people
WHERE password_hash IS NOT NULL;

CREATE OR REPLACE VIEW contacts AS
SELECT 
    id, pp_contact_id, first_name, last_name, email,
    phone, company, address, pp_data, last_sync_at,
    created_at, updated_at
FROM people
WHERE pp_contact_id IS NOT NULL;

-- Step 9: Create function to handle PracticePanther sync
CREATE OR REPLACE FUNCTION sync_practicepanther_contact(
    p_pp_contact_id VARCHAR(255),
    p_email VARCHAR(255),
    p_first_name VARCHAR(100),
    p_last_name VARCHAR(100),
    p_phone VARCHAR(20),
    p_company VARCHAR(255),
    p_address TEXT,
    p_pp_data JSONB
) RETURNS UUID AS $$
DECLARE
    v_person_id UUID;
BEGIN
    -- Try to find existing person by PP ID or email
    SELECT id INTO v_person_id
    FROM people
    WHERE pp_contact_id = p_pp_contact_id
       OR (p_email IS NOT NULL AND LOWER(email) = LOWER(p_email))
    LIMIT 1;
    
    IF v_person_id IS NULL THEN
        -- Create new person
        INSERT INTO people (
            email, role, first_name, last_name, phone,
            company, address, pp_contact_id, pp_data, last_sync_at
        ) VALUES (
            COALESCE(p_email, p_pp_contact_id || '@practicepanther.sync'),
            'client',
            p_first_name, p_last_name, p_phone,
            p_company, p_address, p_pp_contact_id, p_pp_data,
            CURRENT_TIMESTAMP
        ) RETURNING id INTO v_person_id;
    ELSE
        -- Update existing person
        UPDATE people
        SET 
            pp_contact_id = p_pp_contact_id,
            pp_data = p_pp_data,
            first_name = COALESCE(p_first_name, first_name),
            last_name = COALESCE(p_last_name, last_name),
            phone = COALESCE(p_phone, phone),
            company = COALESCE(p_company, company),
            address = COALESCE(p_address, address),
            last_sync_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = v_person_id;
    END IF;
    
    RETURN v_person_id;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Create RLS policies for people table
ALTER TABLE people ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY "Admins can view all people" ON people
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM people
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can see themselves
CREATE POLICY "Users can view own record" ON people
    FOR SELECT
    USING (id = auth.uid());

-- Users can update own record (limited fields)
CREATE POLICY "Users can update own profile" ON people
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid() 
        AND role = (SELECT role FROM people WHERE id = auth.uid())
    );

-- Coordinators can see all people in their exchanges
CREATE POLICY "Coordinators can view exchange participants" ON people
    FOR SELECT
    USING (
        id IN (
            SELECT DISTINCT person_id
            FROM exchange_participants ep
            JOIN exchanges e ON ep.exchange_id = e.id
            WHERE e.coordinator_person_id = auth.uid()
        )
    );

-- Step 11: Create helper function for getting user's exchanges
CREATE OR REPLACE FUNCTION get_person_exchanges(p_person_id UUID)
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
            WHEN e.coordinator_person_id = p_person_id THEN 'coordinator'
            WHEN e.client_person_id = p_person_id THEN 'client'
            WHEN ep.person_id = p_person_id THEN COALESCE(ep.role::TEXT, 'participant')
            ELSE 'participant'
        END as role
    FROM exchanges e
    LEFT JOIN exchange_participants ep ON ep.exchange_id = e.id
    WHERE 
        e.coordinator_person_id = p_person_id
        OR e.client_person_id = p_person_id
        OR ep.person_id = p_person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 12: Add comments
COMMENT ON TABLE people IS 'Unified table combining user authentication and contact information';
COMMENT ON COLUMN people.password_hash IS 'NULL for contacts synced from PracticePanther who cannot login';
COMMENT ON COLUMN people.pp_contact_id IS 'PracticePanther contact ID for synced contacts';

-- Step 13: Note for next steps
-- After verifying data migration:
-- 1. Drop old foreign key columns (client_id, coordinator_id, etc.)
-- 2. Rename new columns (remove _person_id suffix)
-- 3. Drop old users and contacts tables
-- 4. Update all application code to use people table
-- 5. Remove compatibility views