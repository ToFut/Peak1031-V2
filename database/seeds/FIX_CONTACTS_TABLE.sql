-- Add missing display_name column to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Update display_name from first_name and last_name if it's null
UPDATE public.contacts 
SET display_name = COALESCE(
  CASE 
    WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN first_name || ' ' || last_name
    WHEN first_name IS NOT NULL THEN first_name
    WHEN last_name IS NOT NULL THEN last_name
    ELSE email
  END,
  'Unknown Contact'
)
WHERE display_name IS NULL;