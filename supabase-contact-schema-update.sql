-- Peak 1031 Contact Schema Update
-- Run this in your Supabase SQL Editor to update contacts to the new detailed schema

-- 1. Create contact type enum
CREATE TYPE contact_type AS ENUM ('Client', 'Broker', 'Attorney', 'CPA', 'Agent', 'Other');

-- 2. Create backup of current contacts table (optional, for safety)
CREATE TABLE contacts_backup AS SELECT * FROM public.contacts;

-- 3. Add new columns to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS position TEXT,
ADD COLUMN IF NOT EXISTS contact_type contact_type,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 4. Make email NOT NULL and UNIQUE (handle existing NULL emails first)
UPDATE public.contacts 
SET email = 'unknown_' || id::text || '@example.com' 
WHERE email IS NULL OR email = '';

ALTER TABLE public.contacts 
ALTER COLUMN email SET NOT NULL,
ADD CONSTRAINT contacts_email_unique UNIQUE (email);

-- 5. Add generated full_name column
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (first_name || ' ' || last_name) STORED;

-- 6. Create contact_exchange_links table for many-to-many relationship
CREATE TABLE IF NOT EXISTS public.contact_exchange_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
  exchange_id UUID REFERENCES public.exchanges(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, exchange_id) -- Prevent duplicate links
);

-- 7. Migrate existing exchange-contact relationships from exchange_participants
INSERT INTO public.contact_exchange_links (contact_id, exchange_id)
SELECT DISTINCT ep.contact_id, ep.exchange_id
FROM public.exchange_participants ep
WHERE ep.contact_id IS NOT NULL
ON CONFLICT (contact_id, exchange_id) DO NOTHING;

-- 8. Migrate direct client relationships from exchanges table
INSERT INTO public.contact_exchange_links (contact_id, exchange_id)
SELECT DISTINCT e.client_id, e.id
FROM public.exchanges e
WHERE e.client_id IS NOT NULL
ON CONFLICT (contact_id, exchange_id) DO NOTHING;

-- 9. Set default contact types based on existing data patterns
UPDATE public.contacts 
SET contact_type = 'Client'::contact_type
WHERE contact_type IS NULL 
  AND id IN (SELECT DISTINCT client_id FROM public.exchanges WHERE client_id IS NOT NULL);

UPDATE public.contacts 
SET contact_type = 'Other'::contact_type
WHERE contact_type IS NULL;

-- 10. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON public.contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON public.contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_full_name ON public.contacts(full_name);
CREATE INDEX IF NOT EXISTS idx_contact_exchange_links_contact_id ON public.contact_exchange_links(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_exchange_links_exchange_id ON public.contact_exchange_links(exchange_id);

-- 11. Add updated_at trigger for contact_exchange_links
CREATE TRIGGER update_contact_exchange_links_updated_at 
  BEFORE UPDATE ON public.contact_exchange_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Add RLS policies for contact_exchange_links
ALTER TABLE public.contact_exchange_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view contact exchange links for their exchanges" ON public.contact_exchange_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.exchanges e
      WHERE e.id = exchange_id AND (
        e.coordinator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.exchange_participants ep
          WHERE ep.exchange_id = e.id AND ep.user_id = auth.uid()
        ) OR
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

CREATE POLICY "Coordinators and admins can manage contact exchange links" ON public.contact_exchange_links
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.exchanges e
      WHERE e.id = exchange_id AND (
        e.coordinator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.users 
          WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
        )
      )
    )
  );

-- 13. Update existing contacts RLS policies to be more permissive
DROP POLICY IF EXISTS "Authenticated users can view contacts" ON public.contacts;
DROP POLICY IF EXISTS "Coordinators and admins can manage contacts" ON public.contacts;

CREATE POLICY "Users can view contacts in their exchanges" ON public.contacts
  FOR SELECT USING (
    -- Users can see contacts linked to their exchanges
    EXISTS (
      SELECT 1 FROM public.contact_exchange_links cel
      JOIN public.exchanges e ON e.id = cel.exchange_id
      WHERE cel.contact_id = id AND (
        e.coordinator_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.exchange_participants ep
          WHERE ep.exchange_id = e.id AND ep.user_id = auth.uid()
        )
      )
    ) OR
    -- Admins can see all contacts
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Coordinators and admins can manage contacts" ON public.contacts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role IN ('admin', 'coordinator')
    )
  );

-- 14. Create helper function to get contact's exchange IDs
CREATE OR REPLACE FUNCTION public.get_contact_exchange_ids(contact_uuid UUID)
RETURNS UUID[] AS $$
BEGIN
  RETURN ARRAY(
    SELECT exchange_id 
    FROM public.contact_exchange_links 
    WHERE contact_id = contact_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create helper function to link contact to exchange
CREATE OR REPLACE FUNCTION public.link_contact_to_exchange(
  contact_uuid UUID,
  exchange_uuid UUID
)
RETURNS UUID AS $$
DECLARE
  link_id UUID;
BEGIN
  INSERT INTO public.contact_exchange_links (contact_id, exchange_id)
  VALUES (contact_uuid, exchange_uuid)
  ON CONFLICT (contact_id, exchange_id) DO NOTHING
  RETURNING id INTO link_id;
  
  RETURN link_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Create helper function to unlink contact from exchange
CREATE OR REPLACE FUNCTION public.unlink_contact_from_exchange(
  contact_uuid UUID,
  exchange_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  DELETE FROM public.contact_exchange_links 
  WHERE contact_id = contact_uuid AND exchange_id = exchange_uuid;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 