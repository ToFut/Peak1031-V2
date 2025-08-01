-- Check how users are currently assigned to exchanges
-- Run in Supabase SQL Editor

-- 1. Check all exchanges and their assignments
SELECT 
    e.id,
    e.name,
    e.status,
    e.coordinator_id,
    e.client_id,
    u_coord.email as coordinator_email,
    u_coord.role as coordinator_role
FROM exchanges e
LEFT JOIN users u_coord ON e.coordinator_id = u_coord.id;

-- 2. Check exchange_participants table
SELECT 
    ep.exchange_id,
    ep.user_id,
    ep.contact_id,
    ep.role as participant_role,
    e.name as exchange_name,
    u.email as user_email,
    u.role as user_role
FROM exchange_participants ep
LEFT JOIN exchanges e ON ep.exchange_id = e.id
LEFT JOIN users u ON ep.user_id = u.id;

-- 3. Check all users and their roles
SELECT id, email, role, created_at
FROM users
ORDER BY role, created_at;

-- 4. Check if coordinator_id in exchanges matches any user
SELECT 
    'Exchanges with valid coordinator' as check_type,
    COUNT(*) as count
FROM exchanges e
WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = e.coordinator_id);

-- 5. Check Supabase auth users
SELECT 
    id,
    email,
    raw_user_meta_data->>'role' as metadata_role,
    created_at
FROM auth.users
ORDER BY created_at;