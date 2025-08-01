-- Fix exchange visibility for all authenticated users temporarily
-- This will make exchanges visible while we debug the auth issue

-- 1. Drop all existing policies on exchanges
DROP POLICY IF EXISTS "Users can view exchanges" ON exchanges;
DROP POLICY IF EXISTS "Admins can view all exchanges" ON exchanges;
DROP POLICY IF EXISTS "Users can view their exchanges" ON exchanges;

-- 2. Create a simple policy that allows ALL authenticated users to see ALL exchanges
-- (Temporary for debugging)
CREATE POLICY "Authenticated users can view all exchanges" ON exchanges
    FOR SELECT
    TO authenticated
    USING (true);  -- This allows any logged-in user to see all exchanges

-- 3. Do the same for messages
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Admins can view all messages" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their exchanges" ON messages;

CREATE POLICY "Authenticated users can view all messages" ON messages
    FOR SELECT
    TO authenticated
    USING (true);  -- This allows any logged-in user to see all messages

-- 4. And for exchange_participants
DROP POLICY IF EXISTS "Users can view participants" ON exchange_participants;

CREATE POLICY "Authenticated users can view all participants" ON exchange_participants
    FOR SELECT
    TO authenticated
    USING (true);

-- 5. Verify the policies were created
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies 
WHERE tablename IN ('exchanges', 'messages', 'exchange_participants')
ORDER BY tablename;