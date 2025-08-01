-- Fix RLS policies to allow proper access to exchanges and messages
-- Run this in your Supabase SQL Editor

-- 1. First, check current policies
SELECT tablename, policyname, cmd, roles, qual 
FROM pg_policies 
WHERE tablename IN ('exchanges', 'messages', 'exchange_participants')
ORDER BY tablename, policyname;

-- 2. Drop existing restrictive policies if they exist
DROP POLICY IF EXISTS "Users can view their exchanges" ON exchanges;
DROP POLICY IF EXISTS "Users can view messages in their exchanges" ON messages;
DROP POLICY IF EXISTS "Admins can view all exchanges" ON exchanges;
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;

-- 3. Create new comprehensive policies for exchanges
CREATE POLICY "Users can view exchanges" ON exchanges
    FOR SELECT
    TO authenticated
    USING (
        -- Admin sees all
        auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
        OR
        -- Coordinator sees their exchanges
        coordinator_id = auth.uid()
        OR
        -- Client sees their exchanges (if client_id matches a user id)
        client_id = auth.uid()
        OR
        -- Participants see their exchanges
        id IN (
            SELECT exchange_id 
            FROM exchange_participants 
            WHERE user_id = auth.uid()
        )
    );

-- 4. Create policies for messages
CREATE POLICY "Users can view messages" ON messages
    FOR SELECT
    TO authenticated
    USING (
        exchange_id IN (
            SELECT id FROM exchanges
            WHERE 
                -- Admin sees all
                auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
                OR
                -- Coordinator sees their exchanges
                coordinator_id = auth.uid()
                OR
                -- Client sees their exchanges
                client_id = auth.uid()
                OR
                -- Participants see their exchanges
                id IN (
                    SELECT exchange_id 
                    FROM exchange_participants 
                    WHERE user_id = auth.uid()
                )
        )
    );

-- 5. Create policy for exchange_participants (if needed)
CREATE POLICY IF NOT EXISTS "Users can view participants" ON exchange_participants
    FOR SELECT
    TO authenticated
    USING (
        -- Admin sees all
        auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
        OR
        -- Users in the exchange can see other participants
        exchange_id IN (
            SELECT id FROM exchanges
            WHERE coordinator_id = auth.uid()
            OR client_id = auth.uid()
        )
        OR
        -- Participants can see other participants in their exchanges
        user_id = auth.uid()
    );

-- 6. Ensure RLS is enabled on all tables
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_participants ENABLE ROW LEVEL SECURITY;

-- 7. Grant necessary permissions
GRANT SELECT ON exchanges TO authenticated;
GRANT SELECT ON messages TO authenticated;
GRANT SELECT ON exchange_participants TO authenticated;

-- 8. Test the policies by checking what the current user can see
-- (This will show results when run as an authenticated user)
SELECT 'Current user can see ' || COUNT(*) || ' exchanges' as test_result
FROM exchanges;

SELECT 'Current user can see ' || COUNT(*) || ' messages' as test_message
FROM messages;