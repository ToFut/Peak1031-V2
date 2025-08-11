-- ===================================================================
-- INVITATION SYSTEM SETUP FOR SUPABASE
-- Execute this SQL in your Supabase SQL Editor
-- ===================================================================

-- Create the invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  exchange_id UUID NOT NULL REFERENCES public.exchanges(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('client', 'third_party', 'agency', 'coordinator')),
  invited_by UUID NOT NULL REFERENCES public.users(id),
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  custom_message TEXT,
  user_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancelled_by UUID REFERENCES public.users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_exchange_id ON public.invitations(exchange_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON public.invitations(invited_by);

-- Enable Row Level Security
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for secure access
CREATE POLICY "Enable read access for authenticated users" ON public.invitations 
FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable insert for authenticated users" ON public.invitations 
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update for invitation owner or invitee" ON public.invitations 
FOR UPDATE USING (
  auth.uid()::text = invited_by::text OR 
  auth.uid()::text = user_id::text
);

CREATE POLICY "Enable delete for invitation owner" ON public.invitations 
FOR DELETE USING (auth.uid()::text = invited_by::text);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_invitation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_invitation_updated_at
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.invitations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Insert a test invitation (optional - remove if not needed)
-- This can help verify the table is working correctly
-- INSERT INTO public.invitations (
--   email, 
--   exchange_id, 
--   role, 
--   invited_by, 
--   invitation_token, 
--   expires_at,
--   first_name,
--   last_name,
--   custom_message
-- ) VALUES (
--   'test@example.com',
--   (SELECT id FROM public.exchanges LIMIT 1),
--   'client',
--   (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1),
--   'test-token-' || gen_random_uuid()::text,
--   NOW() + INTERVAL '7 days',
--   'Test',
--   'User',
--   'This is a test invitation'
-- );

-- Verify the table was created successfully
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'invitations' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show table constraints
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'invitations'
  AND tc.table_schema = 'public';

-- Show indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'invitations' 
  AND schemaname = 'public';

-- ===================================================================
-- SETUP COMPLETE!
-- 
-- After executing this SQL:
-- 1. The invitations table will be created with proper constraints
-- 2. RLS policies will be in place for security
-- 3. Indexes will be created for performance
-- 4. The invitation system should work properly
-- 
-- Next steps:
-- 1. Go back to your application
-- 2. Test the invitation functionality
-- 3. Send invitations to segev@futurixs.com and +12137086881
-- ===================================================================