-- Add user_id column to exchange_participants table
-- This is needed for coordinator filtering to work properly

-- Add the user_id column if it doesn't exist
ALTER TABLE exchange_participants 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_exchange_participants_user_id 
ON exchange_participants(user_id);

-- Update existing records to set user_id based on contact_id
-- This will map contact_id to user_id for existing participants
UPDATE exchange_participants ep
SET user_id = u.id
FROM users u
WHERE ep.contact_id = u.contact_id
AND ep.user_id IS NULL
AND u.contact_id IS NOT NULL;

-- Verify the update
SELECT 
  COUNT(*) as total_records,
  COUNT(user_id) as records_with_user_id,
  COUNT(contact_id) as records_with_contact_id
FROM exchange_participants;