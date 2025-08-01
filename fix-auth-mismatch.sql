-- Fix authentication mismatch between Supabase Auth and users table
-- Run this in Supabase SQL Editor

-- 1. First, check all auth users and their matching database users
SELECT 
    'Auth User' as user_type,
    au.id as auth_id,
    au.email as auth_email,
    au.created_at as auth_created,
    u.id as db_user_id,
    u.role as db_role,
    CASE 
        WHEN u.id IS NULL THEN 'NO DATABASE USER'
        WHEN u.id != au.id THEN 'ID MISMATCH'
        ELSE 'OK'
    END as status
FROM auth.users au
LEFT JOIN users u ON au.email = u.email
ORDER BY au.created_at;

-- 2. Create missing users in the database for all auth users
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
SET id = EXCLUDED.id;  -- This updates the ID if email already exists

-- 3. Make the first auth user an admin (if needed)
UPDATE users 
SET role = 'admin'
WHERE email IN (
    SELECT email 
    FROM auth.users 
    ORDER BY created_at 
    LIMIT 1
);

-- 4. Add all admin users to all exchanges as participants
INSERT INTO exchange_participants (id, exchange_id, user_id, role, permissions, created_at, updated_at)
SELECT 
    gen_random_uuid() as id,
    e.id as exchange_id,
    u.id as user_id,
    'admin' as role,
    '{"can_read": true, "can_write": true, "can_delete": true}'::jsonb as permissions,
    NOW() as created_at,
    NOW() as updated_at
FROM exchanges e
CROSS JOIN users u
WHERE u.role = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM exchange_participants ep 
    WHERE ep.exchange_id = e.id 
    AND ep.user_id = u.id
);

-- 5. Verify the fix
SELECT 
    'Final Check' as check_type,
    u.email,
    u.role,
    COUNT(DISTINCT ep.exchange_id) as exchanges_count
FROM users u
LEFT JOIN exchange_participants ep ON u.id = ep.user_id
WHERE u.role = 'admin'
GROUP BY u.id, u.email, u.role;

-- 6. Show all exchanges with their participants
SELECT 
    e.name as exchange_name,
    COUNT(DISTINCT ep.user_id) as participant_count,
    STRING_AGG(u.email, ', ') as participants
FROM exchanges e
LEFT JOIN exchange_participants ep ON e.id = ep.exchange_id
LEFT JOIN users u ON ep.user_id = u.id
GROUP BY e.id, e.name
ORDER BY e.name;