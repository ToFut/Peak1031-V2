-- Migration: Add storage_provider column to documents table
-- This column tracks whether documents are stored in Supabase or local storage

BEGIN;

-- Add storage_provider column to documents table
ALTER TABLE documents 
ADD COLUMN storage_provider VARCHAR(20) DEFAULT 'local';

-- Update existing documents to use 'local' as default
UPDATE documents 
SET storage_provider = 'local' 
WHERE storage_provider IS NULL;

-- Create index for storage_provider for better query performance
CREATE INDEX idx_documents_storage_provider ON documents(storage_provider);

COMMIT;