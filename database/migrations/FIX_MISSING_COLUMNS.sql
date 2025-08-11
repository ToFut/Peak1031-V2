-- Fix missing columns for documents and contacts tables
-- Date: 2025-08-07

-- Add description to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add contact_type to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS contact_type VARCHAR(50) DEFAULT 'client';

-- Add any other missing columns for messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type VARCHAR(50) DEFAULT 'text';

-- Fix exchange_participants table structure
ALTER TABLE exchange_participants
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_exchanges_status ON exchanges(status);
CREATE INDEX IF NOT EXISTS idx_exchanges_client_id ON exchanges(client_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_coordinator_id ON exchanges(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_messages_exchange_id ON messages(exchange_id);
CREATE INDEX IF NOT EXISTS idx_documents_exchange_id ON documents(exchange_id);

-- Success message
SELECT 'All missing columns added successfully!' as result;