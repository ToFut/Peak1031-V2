-- Peak 1031 Exchange Schema Update
-- Run this in your Supabase SQL Editor to update to the new detailed exchange schema

-- 1. Create new enum types for the updated exchange system
CREATE TYPE exchange_type AS ENUM ('Delayed', 'Reverse', 'Improvement', 'Other');
CREATE TYPE new_exchange_status AS ENUM ('In Progress', 'Completed', 'Cancelled', 'Draft');

-- 2. Create backup of current exchanges table (optional, for safety)
CREATE TABLE exchanges_backup AS SELECT * FROM public.exchanges;

-- 3. Add new columns to exchanges table
ALTER TABLE public.exchanges 
ADD COLUMN IF NOT EXISTS exchange_name TEXT,
ADD COLUMN IF NOT EXISTS exchange_type exchange_type,
ADD COLUMN IF NOT EXISTS relinquished_property_address TEXT,
ADD COLUMN IF NOT EXISTS relinquished_sale_price NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS relinquished_closing_date DATE,
ADD COLUMN IF NOT EXISTS identification_date DATE,
ADD COLUMN IF NOT EXISTS exchange_deadline DATE,
ADD COLUMN IF NOT EXISTS exchange_coordinator TEXT,
ADD COLUMN IF NOT EXISTS attorney_or_cpa TEXT,
ADD COLUMN IF NOT EXISTS bank_account_escrow TEXT,
ADD COLUMN IF NOT EXISTS new_status new_exchange_status DEFAULT 'Draft';

-- 4. Migrate existing data to new columns (basic mapping)
UPDATE public.exchanges SET 
  exchange_name = name,
  new_status = CASE 
    WHEN status = 'PENDING' THEN 'Draft'::new_exchange_status
    WHEN status = '45D' THEN 'In Progress'::new_exchange_status
    WHEN status = '180D' THEN 'In Progress'::new_exchange_status
    WHEN status = 'COMPLETED' THEN 'Completed'::new_exchange_status
    WHEN status = 'TERMINATED' THEN 'Cancelled'::new_exchange_status
    ELSE 'Draft'::new_exchange_status
  END,
  identification_date = identification_deadline::date,
  exchange_deadline = completion_deadline::date;

-- 5. Create replacement_properties table
CREATE TABLE IF NOT EXISTS public.replacement_properties (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exchange_id UUID REFERENCES public.exchanges(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  purchase_price NUMERIC(12, 2),
  closing_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create exchange_documents table (separate from general documents)
CREATE TABLE IF NOT EXISTS public.exchange_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  exchange_id UUID REFERENCES public.exchanges(id) ON DELETE CASCADE,
  document_url TEXT NOT NULL,
  document_name TEXT,
  document_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_replacement_properties_exchange_id ON public.replacement_properties(exchange_id);
CREATE INDEX IF NOT EXISTS idx_exchange_documents_exchange_id ON public.exchange_documents(exchange_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_exchange_type ON public.exchanges(exchange_type);
CREATE INDEX IF NOT EXISTS idx_exchanges_new_status ON public.exchanges(new_status);

-- 8. Add updated_at triggers for new tables
CREATE TRIGGER update_replacement_properties_updated_at 
  BEFORE UPDATE ON public.replacement_properties
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_exchange_documents_updated_at 
  BEFORE UPDATE ON public.exchange_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Add RLS policies for new tables
ALTER TABLE public.replacement_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exchange_documents ENABLE ROW LEVEL SECURITY;

-- Replacement properties policies (inherit from exchange access)
CREATE POLICY "Users can view replacement properties in their exchanges" ON public.replacement_properties
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

CREATE POLICY "Coordinators and admins can manage replacement properties" ON public.replacement_properties
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

-- Exchange documents policies (inherit from exchange access)
CREATE POLICY "Users can view exchange documents in their exchanges" ON public.exchange_documents
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

CREATE POLICY "Coordinators and admins can manage exchange documents" ON public.exchange_documents
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

-- 10. Optional: After testing, you can drop old columns and rename new ones
-- UNCOMMMENT THESE AFTER TESTING:
-- ALTER TABLE public.exchanges DROP COLUMN IF EXISTS name;
-- ALTER TABLE public.exchanges DROP COLUMN IF EXISTS status;  
-- ALTER TABLE public.exchanges RENAME COLUMN exchange_name TO name;
-- ALTER TABLE public.exchanges RENAME COLUMN new_status TO status;
-- DROP TYPE exchange_status;
-- ALTER TYPE new_exchange_status RENAME TO exchange_status; 