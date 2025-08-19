-- Add user_id column to contacts table
-- This migration fixes the schema mismatch that was causing database errors

-- Add the user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE contacts ADD COLUMN user_id UUID REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);

