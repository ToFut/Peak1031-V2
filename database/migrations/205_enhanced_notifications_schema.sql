-- Enhanced Notifications Schema
-- Add modern notification features with history, categories, and actions

-- Create notification category enum
DO $$ BEGIN
    CREATE TYPE notification_category_enum AS ENUM (
        'system', 'task', 'document', 'exchange', 'message', 
        'participant', 'deadline', 'status', 'security', 'info'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create notification priority enum  
DO $$ BEGIN
    CREATE TYPE notification_priority_enum AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create notification status enum
DO $$ BEGIN
    CREATE TYPE notification_status_enum AS ENUM ('unread', 'read', 'archived', 'deleted');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Update the notifications table to support modern features
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS category notification_category_enum DEFAULT 'system',
ADD COLUMN IF NOT EXISTS priority notification_priority_enum DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS status notification_status_enum DEFAULT 'unread',
ADD COLUMN IF NOT EXISTS action_url TEXT,
ADD COLUMN IF NOT EXISTS action_label VARCHAR(100),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS source_user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- Update existing columns to better names if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read') THEN
        ALTER TABLE public.notifications RENAME COLUMN read TO is_read;
    END IF;
EXCEPTION WHEN undefined_column THEN null; END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON public.notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category ON public.notifications(category);
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_organization ON public.notifications(organization_id);
CREATE INDEX IF NOT EXISTS idx_notifications_exchange ON public.notifications(related_exchange_id);

-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL,
    category notification_category_enum NOT NULL,
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    in_app_enabled BOOLEAN DEFAULT true,
    browser_enabled BOOLEAN DEFAULT true,
    sound_enabled BOOLEAN DEFAULT true,
    desktop_enabled BOOLEAN DEFAULT false,
    frequency VARCHAR(50) DEFAULT 'immediate', -- immediate, hourly, daily, weekly
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, category)
);

-- Create notification history/activity table for audit trail
CREATE TABLE IF NOT EXISTS public.notification_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(50) NOT NULL, -- sent, read, clicked, archived, deleted
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create notification templates table for consistent messaging
CREATE TABLE IF NOT EXISTS public.notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category notification_category_enum NOT NULL,
    priority notification_priority_enum DEFAULT 'medium',
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    action_url_template TEXT,
    action_label VARCHAR(100),
    email_template TEXT,
    sms_template TEXT,
    variables JSONB DEFAULT '{}', -- Available template variables
    is_active BOOLEAN DEFAULT true,
    organization_id UUID REFERENCES organizations(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for notification preferences
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON public.notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_activity_notification ON public.notification_activity(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_activity_user ON public.notification_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON public.notification_templates(category);

-- Insert default notification templates
INSERT INTO public.notification_templates (name, category, priority, title_template, message_template, action_url_template, action_label)
VALUES 
('task_assigned', 'task', 'medium', 'New Task Assigned: {{task_title}}', 'You have been assigned a new task: {{task_title}} for exchange {{exchange_name}}.', '/tasks/{{task_id}}', 'View Task'),
('task_due_soon', 'task', 'high', 'Task Due Soon: {{task_title}}', 'Task {{task_title}} is due on {{due_date}}.', '/tasks/{{task_id}}', 'View Task'),
('task_overdue', 'task', 'urgent', 'Task Overdue: {{task_title}}', 'Task {{task_title}} was due on {{due_date}} and is now overdue.', '/tasks/{{task_id}}', 'View Task'),
('document_uploaded', 'document', 'medium', 'New Document: {{document_name}}', 'A new document {{document_name}} has been uploaded to exchange {{exchange_name}}.', '/documents/{{document_id}}', 'View Document'),
('exchange_status_changed', 'exchange', 'medium', 'Exchange Status Updated', 'Exchange {{exchange_name}} status changed to {{new_status}}.', '/exchanges/{{exchange_id}}', 'View Exchange'),
('participant_added', 'participant', 'low', 'New Participant Added', '{{participant_name}} has been added to exchange {{exchange_name}}.', '/exchanges/{{exchange_id}}', 'View Exchange'),
('message_received', 'message', 'medium', 'New Message from {{sender_name}}', '{{sender_name}}: {{message_preview}}', '/messages/{{message_id}}', 'View Message'),
('deadline_approaching', 'deadline', 'high', '{{deadline_type}} Deadline Approaching', 'Exchange {{exchange_name}} {{deadline_type}} deadline is in {{days_remaining}} days.', '/exchanges/{{exchange_id}}', 'View Exchange'),
('system_maintenance', 'system', 'medium', 'Scheduled Maintenance', 'The system will undergo maintenance on {{maintenance_date}}.', null, null),
('welcome_user', 'system', 'low', 'Welcome to Peak 1031!', 'Welcome {{user_name}}! Your account has been created successfully.', '/dashboard', 'Go to Dashboard')
ON CONFLICT (name) DO NOTHING;

-- Insert default notification preferences for existing users
INSERT INTO public.notification_preferences (user_id, category, email_enabled, in_app_enabled, browser_enabled)
SELECT 
    u.id,
    unnest(ARRAY['system', 'task', 'document', 'exchange', 'message', 'participant', 'deadline', 'status', 'security', 'info']::notification_category_enum[]),
    true,
    true,
    true
FROM users u
ON CONFLICT (user_id, category) DO NOTHING;

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own notification preferences" 
ON public.notification_preferences FOR ALL 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own notification activity" 
ON public.notification_activity FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on notification preferences" 
ON public.notification_preferences FOR ALL 
TO service_role USING (true);

CREATE POLICY "Service role full access on notification activity" 
ON public.notification_activity FOR ALL 
TO service_role USING (true);

CREATE POLICY "Service role full access on notification templates" 
ON public.notification_templates FOR ALL 
TO service_role USING (true);

-- Create function to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notification_preferences (user_id, category, email_enabled, in_app_enabled, browser_enabled)
    SELECT 
        NEW.id,
        unnest(ARRAY['system', 'task', 'document', 'exchange', 'message', 'participant', 'deadline', 'status', 'security', 'info']::notification_category_enum[]),
        true,
        true,
        true
    ON CONFLICT (user_id, category) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-create notification preferences
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON public.users;
CREATE TRIGGER trigger_create_notification_preferences
    AFTER INSERT ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION create_default_notification_preferences();

-- Create function to update notification read status and log activity
CREATE OR REPLACE FUNCTION mark_notification_read(notification_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Update notification status
    UPDATE public.notifications 
    SET 
        status = 'read',
        read_at = NOW(),
        is_read = true
    WHERE id = notification_uuid AND user_id = user_uuid AND status = 'unread';
    
    -- Log the activity
    INSERT INTO public.notification_activity (notification_id, user_id, action, created_at)
    VALUES (notification_uuid, user_uuid, 'read', NOW());
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to get notification count by status
CREATE OR REPLACE FUNCTION get_notification_counts(user_uuid UUID)
RETURNS TABLE (
    unread_count INTEGER,
    total_count INTEGER,
    urgent_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER FILTER (WHERE status = 'unread'),
        COUNT(*)::INTEGER,
        COUNT(*)::INTEGER FILTER (WHERE status = 'unread' AND priority = 'urgent')
    FROM public.notifications 
    WHERE user_id = user_uuid 
    AND (expires_at IS NULL OR expires_at > NOW());
END;
$$ LANGUAGE plpgsql;