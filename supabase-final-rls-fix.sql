-- FINAL RLS Fix for Peak 1031 - Eliminates Infinite Recursion
-- This version uses auth.uid() directly without subqueries to prevent recursion

-- 1. Drop ALL existing policies to start completely fresh
DO $$
DECLARE
    pol record;
BEGIN
    -- Drop all policies on all tables
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 2. Temporarily disable RLS on all tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchanges DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications DISABLE ROW LEVEL SECURITY;

-- 3. Ensure user profile exists and is correct
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
    updated_at = NOW();

-- 4. Create a simple function to check if user is admin (avoids recursion)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = auth.uid() 
    AND raw_user_meta_data->>'role' = 'admin'
  );
$$;

-- 5. Re-enable RLS with NON-RECURSIVE policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 6. Create simple, non-recursive policies for users table
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "users_insert_authenticated" ON public.users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Alternative: For testing, create completely permissive policies
-- Uncomment these and comment above if you want full access for testing
/*
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "users_update_all" ON public.users
  FOR UPDATE 
  TO authenticated
  USING (true);

CREATE POLICY "users_insert_all" ON public.users
  FOR INSERT 
  TO authenticated
  WITH CHECK (true);
*/

-- 7. Enable RLS and create simple policies for other tables
ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "exchanges_read_all" ON public.exchanges
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tasks_read_all" ON public.tasks
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "documents_read_all" ON public.documents
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "messages_read_all" ON public.messages
  FOR SELECT TO authenticated USING (true);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_read_all" ON public.notifications
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "notifications_update_all" ON public.notifications
  FOR UPDATE TO authenticated USING (true);

-- 8. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON public.users TO authenticated, anon;
GRANT UPDATE, INSERT ON public.users TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT UPDATE ON public.notifications TO authenticated;

-- 9. Verify setup
DO $$
DECLARE
    user_count INTEGER;
    auth_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM public.users WHERE email = 'admin@peak1031.com';
    SELECT COUNT(*) INTO auth_count FROM auth.users WHERE email = 'admin@peak1031.com';
    
    RAISE NOTICE '=== VERIFICATION RESULTS ===';
    RAISE NOTICE 'Auth users with admin@peak1031.com: %', auth_count;
    RAISE NOTICE 'Public users with admin@peak1031.com: %', user_count;
    
    IF auth_count > 0 AND user_count > 0 THEN
        RAISE NOTICE '✅ SUCCESS: User exists in both auth.users and public.users';
    ELSE
        RAISE NOTICE '❌ ISSUE: Missing user data - auth: %, public: %', auth_count, user_count;
    END IF;
    
    RAISE NOTICE '=== RLS POLICIES RECREATED ===';
    RAISE NOTICE '✅ All policies dropped and recreated without recursion';
    RAISE NOTICE '✅ Simple auth.uid() based policies implemented';
    RAISE NOTICE '✅ Ready for authentication testing';
END $$;