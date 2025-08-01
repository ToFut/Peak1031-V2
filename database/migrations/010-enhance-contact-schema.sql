-- Migration: Enhance Contact Schema with comprehensive fields
-- Add missing fields to match the comprehensive JSON schema

-- Add new columns to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS position VARCHAR(255),
ADD COLUMN IF NOT EXISTS contact_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS address_street VARCHAR(255),
ADD COLUMN IF NOT EXISTS address_city VARCHAR(100),
ADD COLUMN IF NOT EXISTS address_state VARCHAR(50),
ADD COLUMN IF NOT EXISTS address_zip VARCHAR(20),
ADD COLUMN IF NOT EXISTS source VARCHAR(50),
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(20),
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS related_exchanges JSONB DEFAULT '[]';

-- Update existing contacts to set required fields if missing
UPDATE contacts 
SET first_name = COALESCE(first_name, 'Unknown'),
    last_name = COALESCE(last_name, 'Contact'),
    email = COALESCE(email, 'no-email@example.com')
WHERE first_name IS NULL OR last_name IS NULL OR email IS NULL;

-- Make required fields NOT NULL
ALTER TABLE contacts 
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL,
ALTER COLUMN email SET NOT NULL;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_contact_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_is_primary ON contacts(is_primary);
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_contacts_related_exchanges ON contacts USING GIN (related_exchanges);

-- Add constraints for enum values
ALTER TABLE contacts 
ADD CONSTRAINT check_contact_type 
CHECK (contact_type IN ('Client', 'Broker', 'Attorney', 'CPA', 'Agent', 'Escrow Officer', 'Title Company', 'Notary', 'Lender', 'Other'));

ALTER TABLE contacts 
ADD CONSTRAINT check_source 
CHECK (source IN ('Referral', 'Website', 'Social Media', 'Event', 'Cold Call', 'Other'));

ALTER TABLE contacts 
ADD CONSTRAINT check_preferred_contact_method 
CHECK (preferred_contact_method IN ('Email', 'Phone', 'Text'));

-- Add comments for documentation
COMMENT ON COLUMN contacts.user_id IS 'Reference to the user who owns this contact';
COMMENT ON COLUMN contacts.position IS 'Job position or title';
COMMENT ON COLUMN contacts.contact_type IS 'Type of contact (Client, Broker, Attorney, etc.)';
COMMENT ON COLUMN contacts.address_street IS 'Street address';
COMMENT ON COLUMN contacts.address_city IS 'City';
COMMENT ON COLUMN contacts.address_state IS 'State';
COMMENT ON COLUMN contacts.address_zip IS 'ZIP code';
COMMENT ON COLUMN contacts.source IS 'How this contact was acquired';
COMMENT ON COLUMN contacts.tags IS 'Array of tags for categorization';
COMMENT ON COLUMN contacts.preferred_contact_method IS 'Preferred method of contact';
COMMENT ON COLUMN contacts.is_primary IS 'Whether this is the primary contact';
COMMENT ON COLUMN contacts.notes IS 'Additional notes about the contact';
COMMENT ON COLUMN contacts.related_exchanges IS 'Array of exchange IDs this contact is related to'; 