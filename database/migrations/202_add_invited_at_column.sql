-- Add invited_at column to exchange_participants table
ALTER TABLE exchange_participants
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP WITH TIME ZONE;

-- Update existing records to have invited_at set to created_at if NULL
UPDATE exchange_participants
SET invited_at = created_at
WHERE invited_at IS NULL;