-- Create the organizations table first (referenced by other tables)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'agency',
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create the users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL DEFAULT 'client',
  organization_id UUID REFERENCES organizations(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create other tables
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  contact_type VARCHAR(50),
  company VARCHAR(255),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  client_id UUID REFERENCES contacts(id),
  coordinator_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  day_45_deadline DATE,
  day_180_deadline DATE,
  sale_property JSONB DEFAULT '{}',
  purchase_property JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'medium',
  due_date DATE,
  exchange_id UUID REFERENCES exchanges(id),
  assigned_user_id UUID REFERENCES users(id),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  sender_id UUID REFERENCES users(id),
  exchange_id UUID REFERENCES exchanges(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  file_type VARCHAR(50),
  file_size INTEGER,
  file_url TEXT,
  exchange_id UUID REFERENCES exchanges(id),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  urgency VARCHAR(50) DEFAULT 'medium',
  read BOOLEAN DEFAULT false,
  user_id UUID REFERENCES users(id),
  related_exchange_id UUID REFERENCES exchanges(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.exchange_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exchange_id UUID REFERENCES exchanges(id),
  user_id UUID REFERENCES users(id),
  contact_id UUID REFERENCES contacts(id),
  role VARCHAR(50) NOT NULL,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exchange_id, user_id),
  UNIQUE(exchange_id, contact_id)
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchanges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_participants ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for development
-- Allow all authenticated users to read everything (for development)
CREATE POLICY "Allow authenticated read" ON public.organizations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.exchanges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated read" ON public.exchange_participants FOR SELECT TO authenticated USING (true);

-- Allow service role to do everything
CREATE POLICY "Service role full access" ON public.organizations FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.contacts FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.exchanges FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.tasks FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.messages FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.documents FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.notifications FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access" ON public.exchange_participants FOR ALL TO service_role USING (true);