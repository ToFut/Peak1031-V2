-- Debug why exchanges aren't showing even with policies in place
-- Run each query separately in Supabase SQL Editor

-- 1. Check what user ID is being used by your frontend
SELECT auth.uid() as current_auth_user_id;

-- 2. Check if this matches any user in your users table
SELECT id, email, role, created_at
FROM users 
WHERE id = auth.uid();

-- 3. Check all exchanges and who can see them
SELECT 
    e.id,
    e.name,
    e.coordinator_id,
    e.client_id,
    CASE 
        WHEN e.coordinator_id = auth.uid() THEN 'User is coordinator'
        WHEN e.client_id = auth.uid() THEN 'User is client'
        WHEN EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') THEN 'User is admin'
        WHEN EXISTS (SELECT 1 FROM exchange_participants WHERE exchange_id = e.id AND user_id = auth.uid()) THEN 'User is participant'
        ELSE 'No access'
    END as access_reason
FROM exchanges e;

-- 4. Test if the admin check is working
SELECT 
    auth.uid() as auth_user_id,
    (SELECT role FROM users WHERE id = auth.uid()) as user_role,
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin') as is_admin;

-- 5. Check what policies are currently active
SELECT 
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'exchanges'
ORDER BY policyname;

-- 6. Test the policy directly
SELECT COUNT(*) as visible_exchanges_count
FROM exchanges
WHERE 
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
    OR coordinator_id = auth.uid()
    OR client_id = auth.uid()
    OR id IN (SELECT exchange_id FROM exchange_participants WHERE user_id = auth.uid());