-- Migration: Add document versions and message threading support
-- This migration adds tables and columns needed for document versioning and message threading

-- Create document_versions table for document versioning
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    stored_filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES users(id),
    change_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique version numbers per document
    UNIQUE(document_id, version_number)
);

-- Add indexes for document versions
CREATE INDEX IF NOT EXISTS idx_document_versions_document_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_uploaded_by ON document_versions(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_document_versions_created_at ON document_versions(created_at);

-- Add threading support to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS thread_id UUID,
ADD COLUMN IF NOT EXISTS parent_message_id UUID REFERENCES messages(id),
ADD COLUMN IF NOT EXISTS reply_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reply_at TIMESTAMP WITH TIME ZONE;

-- Add indexes for message threading
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_parent_message_id ON messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_last_reply_at ON messages(last_reply_at);

-- Create notification_templates table for notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    title_template VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    priority VARCHAR(20) DEFAULT 'medium',
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for notification templates
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_is_active ON notification_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_notification_templates_created_by ON notification_templates(created_by);

-- Create notification_batches table for batch notification tracking
CREATE TABLE IF NOT EXISTS notification_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_name VARCHAR(255),
    total_count INTEGER NOT NULL,
    successful_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'processing',
    created_by UUID NOT NULL REFERENCES users(id),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Add indexes for notification batches
CREATE INDEX IF NOT EXISTS idx_notification_batches_created_by ON notification_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_notification_batches_status ON notification_batches(status);
CREATE INDEX IF NOT EXISTS idx_notification_batches_started_at ON notification_batches(started_at);

-- Add batch_id to notifications table for tracking
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS batch_id UUID REFERENCES notification_batches(id),
ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES notification_templates(id);

-- Add indexes for new notification columns
CREATE INDEX IF NOT EXISTS idx_notifications_batch_id ON notifications(batch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_template_id ON notifications(template_id);

-- Function to update reply count when a message is added to a thread
CREATE OR REPLACE FUNCTION update_message_reply_count()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a reply to another message, update the parent's reply count and last_reply_at
    IF NEW.parent_message_id IS NOT NULL THEN
        UPDATE messages 
        SET 
            reply_count = reply_count + 1,
            last_reply_at = NEW.created_at
        WHERE id = NEW.parent_message_id;
        
        -- Set thread_id to match parent if not set
        IF NEW.thread_id IS NULL THEN
            UPDATE messages 
            SET thread_id = (
                SELECT COALESCE(thread_id, id) 
                FROM messages 
                WHERE id = NEW.parent_message_id
            )
            WHERE id = NEW.id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for message reply count updates
DROP TRIGGER IF EXISTS trigger_update_message_reply_count ON messages;
CREATE TRIGGER trigger_update_message_reply_count
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_message_reply_count();

-- Function to update notification template updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notification template updates
DROP TRIGGER IF EXISTS trigger_update_notification_template_updated_at ON notification_templates;
CREATE TRIGGER trigger_update_notification_template_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_template_updated_at();

-- Add RLS policies for document_versions
ALTER TABLE document_versions ENABLE ROW LEVEL SECURITY;

-- Policy for document versions - users can only see versions of documents they have access to
CREATE POLICY "Users can view document versions they have access to" ON document_versions
    FOR SELECT USING (
        document_id IN (
            SELECT d.id FROM documents d
            JOIN exchanges e ON d.exchange_id = e.id
            JOIN exchange_participants ep ON e.id = ep.exchange_id
            WHERE ep.user_id = auth.uid()
        )
        OR 
        -- Admins and coordinators can see all versions
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'coordinator')
        )
    );

-- Policy for creating document versions
CREATE POLICY "Users can create document versions for documents they can edit" ON document_versions
    FOR INSERT WITH CHECK (
        document_id IN (
            SELECT d.id FROM documents d
            JOIN exchanges e ON d.exchange_id = e.id
            JOIN exchange_participants ep ON e.id = ep.exchange_id
            WHERE ep.user_id = auth.uid() 
            AND ep.permissions->>'upload_documents' = 'true'
        )
        OR 
        -- Admins and coordinators can create versions for any document
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role IN ('admin', 'coordinator')
        )
    );

-- Add RLS policies for notification_templates (admin only)
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage notification templates" ON notification_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
        )
    );

-- Add RLS policies for notification_batches (admin only)
ALTER TABLE notification_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can manage notification batches" ON notification_batches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.id = auth.uid() 
            AND u.role = 'admin'
        )
    );

-- Add comment documentation
COMMENT ON TABLE document_versions IS 'Stores multiple versions of documents for version control';
COMMENT ON TABLE notification_templates IS 'Template system for consistent notification messaging';
COMMENT ON TABLE notification_batches IS 'Tracks batch notification operations for monitoring and analytics';

COMMENT ON COLUMN messages.thread_id IS 'Groups related messages into conversation threads';
COMMENT ON COLUMN messages.parent_message_id IS 'References the message this is replying to';
COMMENT ON COLUMN messages.reply_count IS 'Number of direct replies to this message';
COMMENT ON COLUMN messages.last_reply_at IS 'Timestamp of the most recent reply to this message';

-- Insert default notification templates
INSERT INTO notification_templates (name, category, title_template, message_template, variables, priority, created_by)
SELECT 
    'welcome_new_user',
    'system',
    'Welcome to {{platform_name}}!',
    'Welcome {{user_name}}! Your account has been created successfully. You can now access your exchanges and collaborate with your team.',
    '["platform_name", "user_name"]'::jsonb,
    'medium',
    u.id
FROM users u 
WHERE u.role = 'admin' 
AND u.email LIKE '%admin%'
LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO notification_templates (name, category, title_template, message_template, variables, priority, created_by)
SELECT 
    'task_assigned',
    'task',
    'New Task: {{task_title}}',
    'You have been assigned a new task: {{task_title}}. Due date: {{due_date}}. Exchange: {{exchange_name}}.',
    '["task_title", "due_date", "exchange_name"]'::jsonb,
    'high',
    u.id
FROM users u 
WHERE u.role = 'admin' 
AND u.email LIKE '%admin%'
LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO notification_templates (name, category, title_template, message_template, variables, priority, created_by)
SELECT 
    'document_uploaded',
    'document',
    'New Document: {{document_name}}',
    'A new document "{{document_name}}" has been uploaded to exchange {{exchange_name}} by {{uploader_name}}.',
    '["document_name", "exchange_name", "uploader_name"]'::jsonb,
    'medium',
    u.id
FROM users u 
WHERE u.role = 'admin' 
AND u.email LIKE '%admin%'
LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO notification_templates (name, category, title_template, message_template, variables, priority, created_by)
SELECT 
    'deadline_approaching',
    'deadline',
    'Deadline Alert: {{deadline_type}}',
    'Important: The {{deadline_type}} deadline for exchange {{exchange_name}} is approaching on {{deadline_date}}. Please take necessary action.',
    '["deadline_type", "exchange_name", "deadline_date"]'::jsonb,
    'urgent',
    u.id
FROM users u 
WHERE u.role = 'admin' 
AND u.email LIKE '%admin%'
LIMIT 1
ON CONFLICT (name) DO NOTHING;