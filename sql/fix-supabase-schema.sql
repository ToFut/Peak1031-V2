-- Fix Supabase Schema - Add Missing Columns and Update Tables
-- Run this in your Supabase SQL Editor

-- 1. Add is_active column to exchanges table
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 2. Add missing columns to exchanges table
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES contacts(id);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS coordinator_id UUID REFERENCES users(id);
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS completion_date DATE;
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS pp_data JSONB DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP;

-- 3. Add missing columns to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS exchange_id UUID REFERENCES exchanges(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- 4. Add missing columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS exchange_id UUID REFERENCES exchanges(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES users(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS message_type VARCHAR(20) DEFAULT 'text';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_id UUID REFERENCES documents(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_by JSONB DEFAULT '[]';

-- 5. Add missing columns to documents table
ALTER TABLE documents ADD COLUMN IF NOT EXISTS exchange_id UUID REFERENCES exchanges(id);
ALTER TABLE documents ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES users(id);
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

-- 8. Create exchange_participants table if it doesn't exist
CREATE TABLE IF NOT EXISTS exchange_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(exchange_id, COALESCE(contact_id, user_id))
);

-- 9. Create indexes for exchange_participants
CREATE INDEX IF NOT EXISTS idx_exchange_participants_exchange_id ON exchange_participants(exchange_id);
CREATE INDEX IF NOT EXISTS idx_exchange_participants_contact_id ON exchange_participants(contact_id);
CREATE INDEX IF NOT EXISTS idx_exchange_participants_user_id ON exchange_participants(user_id);

-- 10. Create practice_partner_syncs table if it doesn't exist
CREATE TABLE IF NOT EXISTS practice_partner_syncs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_id VARCHAR(255) UNIQUE NOT NULL,
    sync_type VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    start_time TIMESTAMP DEFAULT NOW(),
    end_time TIMESTAMP,
    statistics JSONB,
    errors JSONB,
    config JSONB,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 11. Create indexes for practice_partner_syncs
CREATE INDEX IF NOT EXISTS idx_practice_partner_syncs_status ON practice_partner_syncs(status);
CREATE INDEX IF NOT EXISTS idx_practice_partner_syncs_sync_type ON practice_partner_syncs(sync_type);
CREATE INDEX IF NOT EXISTS idx_practice_partner_syncs_created_by ON practice_partner_syncs(created_by);

-- 12. Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    read BOOLEAN DEFAULT false,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- 14. Add triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for all tables
DROP TRIGGER IF EXISTS update_exchanges_updated_at ON exchanges;
CREATE TRIGGER update_exchanges_updated_at BEFORE UPDATE ON exchanges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_exchange_participants_updated_at ON exchange_participants;
CREATE TRIGGER update_exchange_participants_updated_at BEFORE UPDATE ON exchange_participants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_practice_partner_syncs_updated_at ON practice_partner_syncs;
CREATE TRIGGER update_practice_partner_syncs_updated_at BEFORE UPDATE ON practice_partner_syncs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notifications_updated_at ON notifications;
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. Verify the changes
SELECT 'Schema update completed successfully!' as status; 