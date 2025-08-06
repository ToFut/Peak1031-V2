-- Migration: Cleanup after People merge
-- Purpose: Remove old columns and tables after verifying the people table migration
-- WARNING: Only run this after confirming all data is correctly migrated!

-- Step 1: Drop old foreign key constraints
ALTER TABLE exchanges 
    DROP CONSTRAINT IF EXISTS exchanges_client_id_fkey,
    DROP CONSTRAINT IF EXISTS exchanges_coordinator_id_fkey;

ALTER TABLE tasks
    DROP CONSTRAINT IF EXISTS tasks_assigned_to_fkey,
    DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

ALTER TABLE documents
    DROP CONSTRAINT IF EXISTS documents_uploadedby_fkey;

ALTER TABLE messages
    DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;

ALTER TABLE exchange_participants
    DROP CONSTRAINT IF EXISTS exchange_participants_user_id_fkey,
    DROP CONSTRAINT IF EXISTS exchange_participants_contact_id_fkey;

ALTER TABLE audit_logs
    DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;

-- Step 2: Drop old columns
ALTER TABLE exchanges 
    DROP COLUMN IF EXISTS client_id,
    DROP COLUMN IF EXISTS coordinator_id;

ALTER TABLE tasks
    DROP COLUMN IF EXISTS assigned_to,
    DROP COLUMN IF EXISTS created_by;

ALTER TABLE documents
    DROP COLUMN IF EXISTS "uploadedBy";

ALTER TABLE messages
    DROP COLUMN IF EXISTS sender_id;

ALTER TABLE exchange_participants
    DROP COLUMN IF EXISTS user_id,
    DROP COLUMN IF EXISTS contact_id;

ALTER TABLE audit_logs
    DROP COLUMN IF EXISTS user_id;

-- Step 3: Rename new columns (remove _person_id suffix)
ALTER TABLE exchanges 
    RENAME COLUMN client_person_id TO client_id;
ALTER TABLE exchanges 
    RENAME COLUMN coordinator_person_id TO coordinator_id;

ALTER TABLE tasks
    RENAME COLUMN assigned_to_person_id TO assigned_to;
ALTER TABLE tasks
    RENAME COLUMN created_by_person_id TO created_by;

ALTER TABLE documents
    RENAME COLUMN uploaded_by_person_id TO uploaded_by;

ALTER TABLE messages
    RENAME COLUMN sender_person_id TO sender_id;

ALTER TABLE exchange_participants
    RENAME COLUMN person_id TO participant_id;

ALTER TABLE audit_logs
    RENAME COLUMN person_id TO user_id;

-- Step 4: Drop compatibility views
DROP VIEW IF EXISTS users CASCADE;
DROP VIEW IF EXISTS contacts CASCADE;

-- Step 5: Drop old tables
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;

-- Step 6: Create updated RLS policies with new column names
DROP POLICY IF EXISTS "Coordinators can view exchange participants" ON people;
CREATE POLICY "Coordinators can view exchange participants" ON people
    FOR SELECT
    USING (
        id IN (
            SELECT DISTINCT participant_id
            FROM exchange_participants ep
            JOIN exchanges e ON ep.exchange_id = e.id
            WHERE e.coordinator_id = auth.uid()
        )
    );

-- Step 7: Update the helper function with new column names
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
            WHEN e.coordinator_id = p_person_id THEN 'coordinator'
            WHEN e.client_id = p_person_id THEN 'client'
            WHEN ep.participant_id = p_person_id THEN COALESCE(ep.role::TEXT, 'participant')
            ELSE 'participant'
        END as role
    FROM exchanges e
    LEFT JOIN exchange_participants ep ON ep.exchange_id = e.id
    WHERE 
        e.coordinator_id = p_person_id
        OR e.client_id = p_person_id
        OR ep.participant_id = p_person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Log the cleanup
INSERT INTO audit_logs (
    user_id,
    action,
    entity_type,
    details,
    created_at
) VALUES (
    (SELECT id FROM people WHERE role = 'admin' LIMIT 1),
    'MIGRATION_CLEANUP_COMPLETED',
    'DATABASE',
    jsonb_build_object(
        'migration', '015-cleanup-after-people-merge',
        'changes', ARRAY[
            'Dropped old foreign key constraints',
            'Dropped old columns',
            'Renamed new columns',
            'Dropped compatibility views',
            'Dropped users and contacts tables',
            'Updated RLS policies'
        ]
    ),
    NOW()
);