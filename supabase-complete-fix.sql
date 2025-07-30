-- Complete Fix for Peak 1031 Supabase Authentication
-- This fixes all RLS policies and ensures proper authentication flow

-- 1. First, let's ensure the user exists and check the structure
DO $$
BEGIN
    -- Check if our user exists in auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@peak1031.com') THEN
        RAISE NOTICE 'User admin@peak1031.com not found in auth.users - please create it first';
    END IF;
    
    -- Check if user exists in public.users
    IF NOT EXISTS (SELECT 1 FROM public.users WHERE email = 'admin@peak1031.com') THEN
        RAISE NOTICE 'User admin@peak1031.com not found in public.users - will be created';
    END IF;
END $$;

-- 2. Drop all existing RLS policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON public.users;

-- 3. Disable RLS temporarily to fix any data issues
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- 4. Ensure the user profile exists with correct data
-- This will work regardless of whether the user exists or not
INSERT INTO public.users (id, email, role, first_name, last_name, phone, is_active, two_fa_enabled, created_at, updated_at) 
SELECT 
    au.id,
    au.email,
    'admin'::user_role,
    'John',
    'Smith',
    '+1-555-0101',
    true,
    false,
    NOW(),
    NOW()
FROM auth.users au 
WHERE au.email = 'admin@peak1031.com'
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    first_name = EXCLUDED.first_name,
    last_name = EXCLUDED.last_name,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active,
    two_fa_enabled = EXCLUDED.two_fa_enabled,
    updated_at = NOW();

-- 5. Re-enable RLS with very permissive policies for testing
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Create simple, permissive policies
CREATE POLICY "Allow authenticated users to read users" ON public.users
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to update users" ON public.users
    FOR UPDATE TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated users to insert users" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- 7. Also fix other tables that might cause issues
DROP POLICY IF EXISTS "Users can view exchanges they participate in" ON public.exchanges;
CREATE POLICY "Allow authenticated users to read exchanges" ON public.exchanges
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can view tasks assigned to them or in their exchanges" ON public.tasks;
CREATE POLICY "Allow authenticated users to read tasks" ON public.tasks
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can view documents in their exchanges" ON public.documents;
CREATE POLICY "Allow authenticated users to read documents" ON public.documents
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can view messages in their exchanges" ON public.messages;
CREATE POLICY "Allow authenticated users to read messages" ON public.messages
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Allow authenticated users to read notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Allow authenticated users to update notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (true);

-- 8. Grant all necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- 9. Also grant some permissions to anon for initial connection
GRANT SELECT ON public.users TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- 10. Verify the user was created correctly
DO $$
DECLARE
    user_count INTEGER;
    auth_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users WHERE email = 'admin@peak1031.com';
    SELECT COUNT(*) INTO auth_count FROM auth.users WHERE email = 'admin@peak1031.com';
    
    RAISE NOTICE 'Auth users with admin@peak1031.com: %', auth_count;
    RAISE NOTICE 'Public users with admin@peak1031.com: %', user_count;
    
    IF user_count = 0 THEN
        RAISE NOTICE 'WARNING: No user found in public.users with admin@peak1031.com';
    END IF;
    
    IF auth_count = 0 THEN
        RAISE NOTICE 'WARNING: No user found in auth.users with admin@peak1031.com - create this user first!';
    END IF;
END $$;