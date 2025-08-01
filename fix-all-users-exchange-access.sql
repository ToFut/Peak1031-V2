-- Fix exchange access for ALL user roles (clients, coordinators, third parties)
-- Run this in Supabase SQL Editor

-- 1. First, let's see the current state
SELECT 
    'Current Exchange Assignments' as report_type,
    e.id,
    e.name,
    e.status,
    e.coordinator_id,
    e.client_id,
    coord.email as coordinator_email,
    coord.role as coordinator_role
FROM exchanges e
LEFT JOIN users coord ON e.coordinator_id = coord.id
ORDER BY e.name;

-- 2. Check all users and their roles
SELECT 
    'All Users by Role' as report_type,
    role,
    COUNT(*) as count,
    STRING_AGG(email, ', ') as emails
FROM users
GROUP BY role
ORDER BY role;

-- 3. Sync Supabase Auth users with database users
-- This ensures all logged-in users exist in the users table
INSERT INTO users (id, email, role, first_name, last_name, is_active, two_fa_enabled, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'role', 'client') as role,
    COALESCE(au.raw_user_meta_data->>'first_name', split_part(au.email, '@', 1)) as first_name,
    COALESCE(au.raw_user_meta_data->>'last_name', 'User') as last_name,
    true as is_active,
    false as two_fa_enabled,
    au.created_at,
    au.created_at as updated_at
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = au.id
)
ON CONFLICT (email) DO UPDATE
SET id = EXCLUDED.id;

-- 4. Add coordinators as participants to their exchanges
INSERT INTO exchange_participants (id, exchange_id, user_id, role, permissions, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    e.id,
    e.coordinator_id,
    'coordinator',
    '{"can_read": true, "can_write": true, "can_delete": false}'::jsonb,
    NOW(),
    NOW()
FROM exchanges e
WHERE e.coordinator_id IS NOT NULL
AND EXISTS (SELECT 1 FROM users u WHERE u.id = e.coordinator_id)
AND NOT EXISTS (
    SELECT 1 FROM exchange_participants ep 
    WHERE ep.exchange_id = e.id 
    AND ep.user_id = e.coordinator_id
);

-- 5. Add clients as participants (if client_id references a user)
-- Note: client_id might reference contacts table, not users
INSERT INTO exchange_participants (id, exchange_id, user_id, role, permissions, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    e.id,
    e.client_id,
    'client',
    '{"can_read": true, "can_write": true, "can_delete": false}'::jsonb,
    NOW(),
    NOW()
FROM exchanges e
WHERE e.client_id IS NOT NULL
AND EXISTS (SELECT 1 FROM users u WHERE u.id = e.client_id)
AND NOT EXISTS (
    SELECT 1 FROM exchange_participants ep 
    WHERE ep.exchange_id = e.id 
    AND ep.user_id = e.client_id
);

-- 6. For demo purposes: Assign some exchanges to each user type
-- This ensures every user can see at least one exchange

-- Assign first exchange to all clients
INSERT INTO exchange_participants (id, exchange_id, user_id, role, permissions, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM exchanges ORDER BY created_at LIMIT 1),
    u.id,
    'participant',
    '{"can_read": true, "can_write": true, "can_delete": false}'::jsonb,
    NOW(),
    NOW()
FROM users u
WHERE u.role = 'client'
AND NOT EXISTS (
    SELECT 1 FROM exchange_participants ep 
    WHERE ep.exchange_id = (SELECT id FROM exchanges ORDER BY created_at LIMIT 1)
    AND ep.user_id = u.id
);

-- Assign second exchange to all third parties
INSERT INTO exchange_participants (id, exchange_id, user_id, role, permissions, created_at, updated_at)
SELECT 
    gen_random_uuid(),
    (SELECT id FROM exchanges ORDER BY created_at OFFSET 1 LIMIT 1),
    u.id,
    'third_party',
    '{"can_read": true, "can_write": false, "can_delete": false}'::jsonb,
    NOW(),
    NOW()
FROM users u
WHERE u.role = 'third_party'
AND NOT EXISTS (
    SELECT 1 FROM exchange_participants ep 
    WHERE ep.exchange_id = (SELECT id FROM exchanges ORDER BY created_at OFFSET 1 LIMIT 1)
    AND ep.user_id = u.id
);

-- 7. Update RLS policies to be simpler and more inclusive
DROP POLICY IF EXISTS "Users see exchanges they participate in" ON exchanges;
DROP POLICY IF EXISTS "Users see messages in their exchanges" ON messages;
DROP POLICY IF EXISTS "Users see participants in their exchanges" ON exchange_participants;

-- New simplified policies
CREATE POLICY "Users see their exchanges" ON exchanges
    FOR SELECT
    TO authenticated
    USING (
        -- User is coordinator
        coordinator_id = auth.uid()
        OR
        -- User is client (if client_id is a user)
        client_id = auth.uid()
        OR
        -- User is a participant
        EXISTS (
            SELECT 1 FROM exchange_participants ep
            WHERE ep.exchange_id = exchanges.id
            AND ep.user_id = auth.uid()
        )
        OR
        -- User is admin (sees all)
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.role = 'admin'
        )
    );

CREATE POLICY "Users see messages in their exchanges" ON messages
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM exchanges e
            WHERE e.id = messages.exchange_id
            AND (
                e.coordinator_id = auth.uid()
                OR e.client_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM exchange_participants ep
                    WHERE ep.exchange_id = e.id
                    AND ep.user_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM users u
                    WHERE u.id = auth.uid()
                    AND u.role = 'admin'
                )
            )
        )
    );

CREATE POLICY "Users see participants in their exchanges" ON exchange_participants
    FOR SELECT
    TO authenticated
    USING (
        -- User can see participants if they're in the same exchange
        exchange_id IN (
            SELECT e.id FROM exchanges e
            WHERE e.coordinator_id = auth.uid()
            OR e.client_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM exchange_participants ep2
                WHERE ep2.exchange_id = e.id
                AND ep2.user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM users u
                WHERE u.id = auth.uid()
                AND u.role = 'admin'
            )
        )
    );

-- 8. Allow users to send messages to their exchanges
CREATE POLICY "Users can send messages" ON messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM exchanges e
            WHERE e.id = exchange_id
            AND (
                e.coordinator_id = auth.uid()
                OR e.client_id = auth.uid()
                OR EXISTS (
                    SELECT 1 FROM exchange_participants ep
                    WHERE ep.exchange_id = e.id
                    AND ep.user_id = auth.uid()
                )
            )
        )
    );

-- 9. Verify the fix - show exchange access by role
SELECT 
    u.role,
    COUNT(DISTINCT ep.exchange_id) as exchanges_count,
    STRING_AGG(DISTINCT e.name, ', ') as exchange_names
FROM users u
LEFT JOIN exchange_participants ep ON u.id = ep.user_id
LEFT JOIN exchanges e ON ep.exchange_id = e.id
GROUP BY u.role
ORDER BY u.role;

-- 10. Show who has access to each exchange
SELECT 
    e.name as exchange_name,
    COUNT(DISTINCT ep.user_id) as participant_count,
    STRING_AGG(DISTINCT u.email || ' (' || u.role || ')', ', ') as participants
FROM exchanges e
LEFT JOIN exchange_participants ep ON e.id = ep.exchange_id
LEFT JOIN users u ON ep.user_id = u.id
GROUP BY e.id, e.name
ORDER BY e.name;