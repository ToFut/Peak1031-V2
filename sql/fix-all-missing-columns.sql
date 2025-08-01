-- Fix All Missing Columns in Supabase Database
-- Run this in your Supabase SQL Editor

-- 1. Add missing columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'MEDIUM';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS exchange_id UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID;

-- 2. Add missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS exchange_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_id UUID;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by JSONB DEFAULT '[]';

-- 3. Add missing columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS exchange_id UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by UUID;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS pp_document_id VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS pp_matter_id VARCHAR(255);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'manual';
ALTER TABLE documents ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS pin_required BOOLEAN DEFAULT false;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255);

-- 4. Add missing columns to exchanges table (if not already added)
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS client_id UUID;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS coordinator_id UUID;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS completion_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_data JSONB DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS exchange_value DECIMAL(15,2);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS identification_deadline TIMESTAMP;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS completion_deadline TIMESTAMP;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS notes TEXT;

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_exchange_id ON tasks(exchange_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

CREATE INDEX IF NOT EXISTS idx_messages_exchange_id ON messages(exchange_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

CREATE INDEX IF NOT EXISTS idx_documents_exchange_id ON documents(exchange_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);

CREATE INDEX IF NOT EXISTS idx_exchanges_exchange_value ON exchanges(exchange_value);
CREATE INDEX IF NOT EXISTS idx_exchanges_identification_deadline ON exchanges(identification_deadline);
CREATE INDEX IF NOT EXISTS idx_exchanges_completion_deadline ON exchanges(completion_deadline);

-- 6. Update existing records to have proper defaults
UPDATE tasks SET priority = 'MEDIUM' WHERE priority IS NULL;
UPDATE tasks SET due_date = NULL WHERE due_date IS NULL;
UPDATE messages SET message_type = 'text' WHERE message_type IS NULL;
UPDATE documents SET category = 'general' WHERE category IS NULL;
UPDATE documents SET source = 'manual' WHERE source IS NULL;
UPDATE exchanges SET is_active = true WHERE is_active IS NULL;

-- 7. Verify the changes
SELECT 'All missing columns added successfully!' as status; 