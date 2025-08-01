-- Simple Supabase Schema Fix - Add Missing Columns Only
-- Run this in your Supabase SQL Editor

-- 1. Add is_active column to exchanges table
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add missing columns to exchanges table
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS coordinator_id UUID;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS completion_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_data JSONB DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP;

-- 3. Add missing columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS exchange_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID;

-- 4. Add missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS exchange_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by JSONB DEFAULT '[]';

-- 5. Add missing columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS exchange_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS pp_document_id VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS pp_matter_id VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_exchanges_is_active ON exchanges(is_active);
CREATE INDEX IF NOT EXISTS idx_exchanges_client_id ON exchanges(client_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_coordinator_id ON exchanges(coordinator_id);
CREATE INDEX IF NOT EXISTS idx_exchanges_start_date ON exchanges(start_date);
CREATE INDEX IF NOT EXISTS idx_exchanges_last_sync ON exchanges(last_sync_at);

CREATE INDEX IF NOT EXISTS idx_tasks_exchange_id ON tasks(exchange_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_messages_exchange_id ON messages(exchange_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_documents_exchange_id ON documents(exchange_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);

-- 7. Update existing records to have is_active = true
UPDATE exchanges SET is_active = true WHERE is_active IS NULL;

-- 8. Verify the changes
SELECT 'Schema update completed successfully!' as status; 