-- Add user-related columns to CONTACTS table to eliminate PEOPLE table duplication
-- This will make CONTACTS the single source of truth for both contacts and users

-- Add user-specific columns from PEOPLE table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_user BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role VARCHAR(50);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS two_fa_secret VARCHAR(255);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS last_login TIMESTAMP;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS contact_link_id UUID;

-- Add indexes for user-related queries
CREATE INDEX IF NOT EXISTS idx_contacts_is_user ON contacts(is_user);
CREATE INDEX IF NOT EXISTS idx_contacts_is_active ON contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_contacts_role ON contacts(role);
CREATE INDEX IF NOT EXISTS idx_contacts_email_verified ON contacts(email_verified);
CREATE INDEX IF NOT EXISTS idx_contacts_last_login ON contacts(last_login);