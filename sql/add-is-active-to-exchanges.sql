-- Add is_active column to exchanges table
ALTER TABLE exchanges ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Create index for better performance
CREATE INDEX idx_exchanges_is_active ON exchanges(is_active);

-- Update existing records to have is_active = true
UPDATE exchanges SET is_active = true WHERE is_active IS NULL; 