-- Add missing columns to users table if they don't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Now insert/update the user profile
INSERT INTO public.users (id, email, display_name, first_name, last_name, role, organization_id, is_active)
VALUES (
  '9e9d6a98-faa6-4cd6-9c3b-57567ba8f2b3',
  'admin@peak1031.com',
  'Admin User',
  'Admin',
  'User',
  'admin',
  (SELECT id FROM organizations WHERE name = 'Peak 1031 Demo' LIMIT 1),
  true
)
ON CONFLICT (id) DO UPDATE SET
  organization_id = EXCLUDED.organization_id,
  display_name = EXCLUDED.display_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;