-- Migration: Fix exchange_participants columns
-- Purpose: Ensure exchange_participants has correct column names
-- Date: Created by system

-- Check and rename columns if needed
DO $$
BEGIN
    -- Check if we need to rename participant_id to user_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exchange_participants' 
        AND column_name = 'participant_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'exchange_participants' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE exchange_participants RENAME COLUMN participant_id TO user_id;
    END IF;
END $$;

-- Ensure both user_id and contact_id columns exist
ALTER TABLE exchange_participants 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES people(id);

ALTER TABLE exchange_participants 
ADD COLUMN IF NOT EXISTS contact_id UUID REFERENCES people(id);

-- Update the get_user_exchanges function to handle the correct columns
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
    
    IF v_user IS NULL THEN
        RETURN; -- No user found
    END IF;
    
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
    LEFT JOIN people client ON e.client_id = client.id
    WHERE 
        -- User is coordinator
        e.coordinator_id = p_user_id
        -- OR user/contact is client
        OR e.client_id = p_user_id
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

-- Add comment
COMMENT ON FUNCTION get_user_exchanges IS 'Returns all exchanges accessible to a user based on their role and linked contact (updated for correct column names)';