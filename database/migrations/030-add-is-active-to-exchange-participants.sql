-- Migration: Add is_active column to exchange_participants
-- Purpose: Add missing is_active column that the code expects
-- Date: Created to fix message viewing permission issues

-- Add is_active column to exchange_participants table
ALTER TABLE exchange_participants 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_exchange_participants_is_active 
ON exchange_participants(is_active);

-- Update existing records to have is_active = true
UPDATE exchange_participants 
SET is_active = true 
WHERE is_active IS NULL;

-- Add comment
COMMENT ON COLUMN exchange_participants.is_active IS 'Whether this participant record is active (true) or inactive (false)';


