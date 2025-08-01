-- Add missing organization_id column to exchanges table
ALTER TABLE public.exchanges 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Update all exchanges to belong to the demo organization
UPDATE public.exchanges 
SET organization_id = (SELECT id FROM organizations WHERE name = 'Peak 1031 Demo' LIMIT 1)
WHERE organization_id IS NULL;