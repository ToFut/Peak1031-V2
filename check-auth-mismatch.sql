-- Check for auth mismatch issue
-- Run these queries in Supabase SQL Editor

-- 1. Get the current auth user ID
SELECT auth.uid() as "Current Auth User ID";

-- 2. Check if this user exists in the users table
SELECT 
    'User exists in database' as status,
    id,
    email,
    role
FROM users 
WHERE id = auth.uid();

-- 3. If above returns nothing, let's see all admin users
SELECT 
    'Admin users in database' as user_type,
    id,
    email,
    role,
    created_at
FROM users 
WHERE role = 'admin'
ORDER BY created_at;

-- 4. Check if there's an email match instead of ID match
SELECT 
    'Email match check' as check_type,
    id,
    email,
    role
FROM users 
WHERE email = auth.email();

-- 5. See the auth metadata
SELECT 
    auth.uid() as auth_id,
    auth.email() as auth_email,
    auth.role() as auth_role;

-- 6. SOLUTION: If the IDs don't match, update the user record
-- First run queries above, then if needed:
-- UPDATE users 
-- SET id = auth.uid() 
-- WHERE email = auth.email() AND role = 'admin';