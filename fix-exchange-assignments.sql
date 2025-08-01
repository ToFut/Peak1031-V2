-- Complete fix for exchange assignments and visibility
-- Run each section in order in Supabase SQL Editor

-- SECTION 1: Understand the current state
-- =======================================

-- Check if auth users match database users
SELECT 
    au.id as auth_id,
    au.email as auth_email,
    u.id as db_user_id,
    u.email as db_user_email,
    u.role as db_user_role
FROM auth.users au
LEFT JOIN users u ON au.email = u.email
ORDER BY au.email;

-- SECTION 2: Fix user ID mismatches
-- ==================================

-- If auth users don't match database users, we need to sync them
-- This updates users table to use Supabase Auth IDs
UPDATE users u
SET id = au.id
FROM auth.users au
WHERE u.email = au.email
AND u.id != au.id;

-- SECTION 3: Assign admin to all exchanges
-- ========================================

-- First, get the admin user from auth
WITH admin_user AS (
    SELECT u.id, u.email
    FROM users u
    JOIN auth.users au ON u.email = au.email
    WHERE u.role = 'admin'
    LIMIT 1
)
-- Insert admin as participant in all exchanges
INSERT INTO exchange_participants (exchange_id, user_id, role, permissions)
SELECT 
    e.id as exchange_id,
    au.id as user_id,
    'admin' as role,
    '{"can_read": true, "can_write": true, "can_delete": true}'::jsonb as permissions
FROM exchanges e
CROSS JOIN admin_user au
WHERE NOT EXISTS (
    SELECT 1 FROM exchange_participants ep 
    WHERE ep.exchange_id = e.id 
    AND ep.user_id = au.id
);

-- SECTION 4: Create simple RLS policies
-- =====================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Authenticated users can view all exchanges" ON exchanges;
DROP POLICY IF EXISTS "Authenticated users can view all messages" ON messages;
DROP POLICY IF EXISTS "Authenticated users can view all participants" ON exchange_participants;

-- Create new policies based on exchange_participants
CREATE POLICY "Users see exchanges they participate in" ON exchanges
    FOR SELECT
    TO authenticated
    USING (
        -- User is a participant
        EXISTS (
            SELECT 1 FROM exchange_participants ep
            WHERE ep.exchange_id = exchanges.id
            AND ep.user_id = auth.uid()
        )
        OR
        -- User is the coordinator
        coordinator_id = auth.uid()
    );

CREATE POLICY "Users see messages in their exchanges" ON messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exchanges e
            WHERE e.id = messages.exchange_id
            AND (
                -- User is a participant
                EXISTS (
                    SELECT 1 FROM exchange_participants ep
                    WHERE ep.exchange_id = e.id
                    AND ep.user_id = auth.uid()
                )
                OR
                -- User is the coordinator
                e.coordinator_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users see participants in their exchanges" ON exchange_participants
    FOR SELECT
    TO authenticated
    USING (
        -- User is in the same exchange
        exchange_id IN (
            SELECT exchange_id 
            FROM exchange_participants 
            WHERE user_id = auth.uid()
        )
        OR
        -- User is coordinator of the exchange
        exchange_id IN (
            SELECT id 
            FROM exchanges 
            WHERE coordinator_id = auth.uid()
        )
    );

-- SECTION 5: Verify the fix
-- =========================

-- Check admin is now participant in all exchanges
SELECT 
    e.name as exchange_name,
    ep.user_id,
    ep.role,
    u.email
FROM exchanges e
JOIN exchange_participants ep ON e.id = ep.exchange_id
JOIN users u ON ep.user_id = u.id
WHERE u.role = 'admin'
ORDER BY e.name;

-- Count total participants per exchange
SELECT 
    e.name,
    COUNT(DISTINCT ep.user_id) as participant_count
FROM exchanges e
LEFT JOIN exchange_participants ep ON e.id = ep.exchange_id
GROUP BY e.id, e.name
ORDER BY e.name;