-- Add missing columns to people table for entity extraction
ALTER TABLE people ADD COLUMN IF NOT EXISTS contact_type TEXT;
ALTER TABLE people ADD COLUMN IF NOT EXISTS last_exchange_assignment TIMESTAMPTZ;
ALTER TABLE people ADD COLUMN IF NOT EXISTS full_name TEXT GENERATED ALWAYS AS (
  COALESCE(first_name || ' ' || last_name, first_name, last_name, email)
) STORED;
ALTER TABLE people ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_people_contact_type ON people(contact_type);
CREATE INDEX IF NOT EXISTS idx_people_full_name ON people(full_name);

-- Add comment to explain the table
COMMENT ON TABLE people IS 'Stores all individuals and entities involved in exchanges - includes both system users (with login) and non-user contacts (buyers, sellers, banks, attorneys)';
COMMENT ON COLUMN people.contact_type IS 'Type of contact: client, attorney, bank, buyer, seller, broker, agent, etc.';
COMMENT ON COLUMN people.assigned_exchanges IS 'Array of exchange IDs this person is involved in';
COMMENT ON COLUMN people.is_user IS 'True if this person has login access to the system';