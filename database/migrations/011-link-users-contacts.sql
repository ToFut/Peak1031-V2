-- Add contact_id to users table to link users with contacts
ALTER TABLE users 
ADD COLUMN contact_id UUID REFERENCES contacts(id);

-- Create index for better performance
CREATE INDEX idx_users_contact_id ON users(contact_id);

-- Add comment explaining the relationship
COMMENT ON COLUMN users.contact_id IS 'Links user account to contact record for clients who need to see their exchanges';

-- Update existing users to link with contacts by email
UPDATE users u
SET contact_id = c.id
FROM contacts c
WHERE u.email = c.email
  AND u.role IN ('client', 'third_party')
  AND u.contact_id IS NULL;