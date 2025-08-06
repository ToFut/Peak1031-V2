-- Migration: Split People table into separate Users and Contacts tables
-- Purpose: Create proper separation between authentication (users) and business data (contacts)
-- Date: Created by system

-- Step 1: Create the USERS table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'client',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    two_fa_enabled BOOLEAN DEFAULT false,
    two_fa_secret VARCHAR(255),
    last_login TIMESTAMP,
    contact_id UUID, -- Will reference contacts table
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_role CHECK (role IN ('admin', 'coordinator', 'client', 'third_party', 'agency'))
);

-- Step 2: Create the CONTACTS table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    company VARCHAR(255),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(50),
    address_zip_code VARCHAR(20),
    address_country VARCHAR(100),
    pp_contact_id VARCHAR(255) UNIQUE,
    pp_data JSONB,
    source VARCHAR(50),
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_contact_id ON users(contact_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_pp_contact_id ON contacts(pp_contact_id);

-- Step 4: Migrate data from people table
-- First, migrate all contact records (is_user = false)
INSERT INTO contacts (
    id, email, first_name, last_name, phone, company,
    address_street, address_city, address_state, address_zip_code, address_country,
    pp_contact_id, pp_data, source, last_sync_at, created_at, updated_at
)
SELECT 
    id, email, first_name, last_name, phone, company,
    address_street, address_city, address_state, address_zip_code, address_country,
    pp_contact_id, pp_data, source, last_sync_at, created_at, updated_at
FROM people
WHERE is_user = false
ON CONFLICT (id) DO NOTHING;

-- Step 5: Migrate all user records (is_user = true)
INSERT INTO users (
    id, email, password_hash, role, first_name, last_name, phone,
    is_active, two_fa_enabled, two_fa_secret, last_login,
    contact_id, created_at, updated_at
)
SELECT 
    id, email, password_hash, role, first_name, last_name, phone,
    is_active, two_fa_enabled, two_fa_secret, last_login,
    contact_link_id, created_at, updated_at
FROM people
WHERE is_user = true
ON CONFLICT (id) DO NOTHING;

-- Step 6: Add foreign key constraint after data is migrated
ALTER TABLE users 
ADD CONSTRAINT fk_users_contact_id 
FOREIGN KEY (contact_id) REFERENCES contacts(id);

-- Step 7: Create function to get user's accessible exchanges
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
    -- Get user record with contact_id
    SELECT * INTO v_user
    FROM users
    WHERE id = p_user_id;
    
    IF v_user IS NULL THEN
        RETURN; -- No user found
    END IF;
    
    -- Get linked contact ID
    v_contact_id := v_user.contact_id;
    
    RETURN QUERY
    SELECT DISTINCT
        e.id,
        COALESCE(e.name, e.exchange_name)::TEXT,
        e.status::TEXT,
        e.priority::TEXT,
        CASE
            WHEN e.coordinator_id = p_user_id THEN 'coordinator'
            WHEN e.client_id = v_contact_id THEN 'client'
            WHEN EXISTS (
                SELECT 1 FROM exchange_participants ep 
                WHERE ep.exchange_id = e.id 
                AND ep.user_id = p_user_id
            ) THEN 'participant'
            WHEN EXISTS (
                SELECT 1 FROM exchange_participants ep 
                WHERE ep.exchange_id = e.id 
                AND ep.contact_id = v_contact_id
            ) THEN 'participant'
            ELSE 'viewer'
        END as role,
        COALESCE(client.first_name || ' ' || client.last_name, 'No Client Assigned')::TEXT as client_name
    FROM exchanges e
    LEFT JOIN contacts client ON e.client_id = client.id
    WHERE 
        -- User is coordinator
        e.coordinator_id = p_user_id
        -- OR user's contact is client
        OR (v_contact_id IS NOT NULL AND e.client_id = v_contact_id)
        -- OR user is participant
        OR EXISTS (
            SELECT 1 FROM exchange_participants ep 
            WHERE ep.exchange_id = e.id 
            AND ep.user_id = p_user_id
        )
        -- OR linked contact is participant
        OR (v_contact_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM exchange_participants ep 
            WHERE ep.exchange_id = e.id 
            AND ep.contact_id = v_contact_id
        ))
        -- OR admin sees all
        OR v_user.role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Update foreign key references in other tables
-- Update exchanges to reference users/contacts properly
-- (coordinator_id should reference users, client_id should reference contacts)

-- Nothing to do here as exchanges already reference the correct IDs

-- Step 9: Create trigger for automatic user-contact linking
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

DROP TRIGGER IF EXISTS trigger_link_user_to_contact ON users;
CREATE TRIGGER trigger_link_user_to_contact
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION link_user_to_contact_on_create();

-- Step 10: Create RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Users can see themselves
CREATE POLICY "Users can view own record" ON users
    FOR SELECT
    USING (id = auth.uid());

-- Users can update their own record
CREATE POLICY "Users can update own record" ON users
    FOR UPDATE
    USING (id = auth.uid());

-- Users can see their linked contact
CREATE POLICY "Users can view their linked contact" ON contacts
    FOR SELECT
    USING (
        id IN (
            SELECT contact_id FROM users WHERE id = auth.uid() AND contact_id IS NOT NULL
        )
    );

-- Admins can see all
CREATE POLICY "Admins can view all users" ON users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all contacts" ON contacts
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Step 11: Add comments
COMMENT ON TABLE users IS 'User accounts for authentication and authorization';
COMMENT ON TABLE contacts IS 'Contact records for business data, synced from PracticePanther';
COMMENT ON COLUMN users.contact_id IS 'Links user account to contact record for business data access';

-- Step 12: IMPORTANT - After verifying the migration worked correctly, 
-- you should drop the people table:
-- DROP TABLE people CASCADE;
-- But do this only after confirming all data is correctly migrated!