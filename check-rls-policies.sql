-- Check RLS policies on exchanges table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'exchanges';

-- Check if RLS is enabled on exchanges
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'exchanges';

-- Check RLS policies on messages table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'messages';

-- Suggested RLS policy to allow authenticated users to see exchanges they're involved with
-- This would need to be run in Supabase SQL editor:

/*
-- Enable RLS on exchanges if not already enabled
ALTER TABLE exchanges ENABLE ROW LEVEL SECURITY;

-- Allow users to see exchanges where they are coordinator, client, or participant
CREATE POLICY "Users can view their exchanges" ON exchanges
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = coordinator_id OR
        auth.uid() IN (
            SELECT user_id FROM exchange_participants WHERE exchange_id = exchanges.id
        ) OR
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- Allow users to see messages in their exchanges
CREATE POLICY "Users can view messages in their exchanges" ON messages
    FOR SELECT
    TO authenticated
    USING (
        exchange_id IN (
            SELECT id FROM exchanges WHERE
            auth.uid() = coordinator_id OR
            auth.uid() IN (
                SELECT user_id FROM exchange_participants WHERE exchange_id = exchanges.id
            ) OR
            auth.uid() IN (
                SELECT id FROM users WHERE role = 'admin'
            )
        )
    );
*/