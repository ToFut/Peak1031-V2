-- Add default_document_pin column to users table
-- This allows users to set a default PIN for document protection

-- Add the column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS default_document_pin VARCHAR(10);

-- Add a comment to describe the column
COMMENT ON COLUMN users.default_document_pin IS 'Default PIN for document protection (4-10 digits)';