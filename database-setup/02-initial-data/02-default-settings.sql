-- ============================================
-- SYSTEM SETTINGS FOR PEAK 1031 PLATFORM
-- Version: 1.0.0
-- Date: 2025-08-07
-- ============================================

-- Create system_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS system_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text UNIQUE NOT NULL,
    value text,
    category text DEFAULT 'general',
    description text,
    is_encrypted boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system settings
INSERT INTO system_settings (key, value, category, description) VALUES
    ('platform_name', 'Peak 1031 Exchange Platform', 'branding', 'Display name for the platform'),
    ('platform_version', '1.0.0', 'system', 'Current platform version'),
    ('default_timezone', 'America/New_York', 'general', 'Default timezone for the system'),
    ('currency', 'USD', 'financial', 'Default currency for financial calculations'),
    ('date_format', 'MM/DD/YYYY', 'display', 'Default date format for display'),
    ('time_format', '12h', 'display', 'Default time format (12h or 24h)'),
    ('session_timeout', '480', 'security', 'Session timeout in minutes'),
    ('max_file_size', '10485760', 'files', 'Maximum file upload size in bytes (10MB)'),
    ('allowed_file_types', 'pdf,doc,docx,xls,xlsx,jpg,jpeg,png,gif', 'files', 'Allowed file extensions for uploads'),
    ('notification_email_enabled', 'true', 'notifications', 'Enable email notifications'),
    ('notification_sms_enabled', 'false', 'notifications', 'Enable SMS notifications'),
    ('pp_sync_enabled', 'true', 'integration', 'Enable PracticePanther sync'),
    ('pp_sync_interval', '15', 'integration', 'PracticePanther sync interval in minutes'),
    ('pp_full_sync_time', '02:00', 'integration', 'Daily full sync time (HH:MM)'),
    ('audit_retention_days', '365', 'compliance', 'Number of days to retain audit logs'),
    ('notification_retention_days', '30', 'system', 'Number of days to retain read notifications'),
    ('backup_retention_days', '90', 'system', 'Number of days to retain database backups'),
    ('identification_deadline_days', '45', 'exchange', 'Default identification period in days'),
    ('exchange_deadline_days', '180', 'exchange', 'Default exchange completion period in days'),
    ('dashboard_refresh_interval', '30', 'ui', 'Dashboard auto-refresh interval in seconds'),
    ('max_dashboard_items', '100', 'ui', 'Maximum items to show on dashboard'),
    ('enable_real_time_messaging', 'true', 'features', 'Enable real-time messaging features'),
    ('enable_document_templates', 'true', 'features', 'Enable document template system'),
    ('enable_ai_analysis', 'true', 'features', 'Enable AI-powered analysis features'),
    ('enable_advanced_search', 'true', 'features', 'Enable advanced search capabilities'),
    ('maintenance_mode', 'false', 'system', 'Enable maintenance mode'),
    ('registration_enabled', 'false', 'security', 'Allow new user registration'),
    ('password_min_length', '8', 'security', 'Minimum password length'),
    ('password_require_special', 'true', 'security', 'Require special characters in passwords'),
    ('two_fa_required', 'false', 'security', 'Require two-factor authentication'),
    ('api_rate_limit', '1000', 'security', 'API rate limit per 15 minutes'),
    ('log_level', 'info', 'system', 'System log level (debug, info, warn, error)'),
    ('support_email', 'support@peak1031.com', 'contact', 'Support contact email'),
    ('support_phone', '+1-555-PEAK1031', 'contact', 'Support contact phone')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- Insert default notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text UNIQUE NOT NULL,
    subject text,
    email_body text,
    sms_body text,
    variables text[], -- Array of available variables
    category text DEFAULT 'general',
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);

-- Insert default notification templates
INSERT INTO notification_templates (name, subject, email_body, sms_body, variables, category) VALUES
    (
        'deadline_warning_identification',
        'Identification Deadline Alert - {{exchange_name}}',
        'Dear {{client_name}},

This is a reminder that the identification deadline for your 1031 exchange "{{exchange_name}}" is approaching.

Deadline Date: {{identification_deadline}}
Days Remaining: {{days_remaining}}

Please ensure all required identification documents are submitted before the deadline.

If you have any questions, please contact your coordinator.

Best regards,
Peak 1031 Exchange Team',
        'Alert: Your 1031 exchange "{{exchange_name}}" identification deadline is in {{days_remaining}} days ({{identification_deadline}}). Please submit required documents.',
        ARRAY['client_name', 'exchange_name', 'identification_deadline', 'days_remaining'],
        'deadline'
    ),
    (
        'deadline_warning_exchange',
        'Exchange Completion Deadline Alert - {{exchange_name}}',
        'Dear {{client_name}},

This is a reminder that the completion deadline for your 1031 exchange "{{exchange_name}}" is approaching.

Deadline Date: {{exchange_deadline}}
Days Remaining: {{days_remaining}}

Please ensure your exchange is completed before the deadline to maintain tax-deferred status.

If you have any questions, please contact your coordinator.

Best regards,
Peak 1031 Exchange Team',
        'Alert: Your 1031 exchange "{{exchange_name}}" completion deadline is in {{days_remaining}} days ({{exchange_deadline}}). Please complete your exchange.',
        ARRAY['client_name', 'exchange_name', 'exchange_deadline', 'days_remaining'],
        'deadline'
    ),
    (
        'document_uploaded',
        'Document Uploaded - {{exchange_name}}',
        'Dear {{client_name}},

A new document has been uploaded to your 1031 exchange "{{exchange_name}}":

Document: {{document_name}}
Uploaded by: {{uploader_name}}
Upload Date: {{upload_date}}

You can view this document by logging into your account.

Best regards,
Peak 1031 Exchange Team',
        'New document "{{document_name}}" uploaded to your exchange "{{exchange_name}}" by {{uploader_name}}.',
        ARRAY['client_name', 'exchange_name', 'document_name', 'uploader_name', 'upload_date'],
        'document'
    ),
    (
        'task_assigned',
        'Task Assigned - {{task_title}}',
        'Dear {{assignee_name}},

A new task has been assigned to you:

Exchange: {{exchange_name}}
Task: {{task_title}}
Due Date: {{due_date}}
Priority: {{priority}}

Description:
{{task_description}}

Please complete this task by the due date.

Best regards,
Peak 1031 Exchange Team',
        'New task assigned: "{{task_title}}" for exchange "{{exchange_name}}" due {{due_date}}.',
        ARRAY['assignee_name', 'exchange_name', 'task_title', 'task_description', 'due_date', 'priority'],
        'task'
    ),
    (
        'exchange_status_changed',
        'Exchange Status Update - {{exchange_name}}',
        'Dear {{client_name}},

The status of your 1031 exchange "{{exchange_name}}" has been updated:

Previous Status: {{old_status}}
New Status: {{new_status}}
Updated by: {{updated_by}}
Update Date: {{update_date}}

{{status_message}}

If you have any questions, please contact your coordinator.

Best regards,
Peak 1031 Exchange Team',
        'Exchange "{{exchange_name}}" status updated from {{old_status}} to {{new_status}}.',
        ARRAY['client_name', 'exchange_name', 'old_status', 'new_status', 'updated_by', 'update_date', 'status_message'],
        'status'
    )
ON CONFLICT (name) DO UPDATE SET
    subject = EXCLUDED.subject,
    email_body = EXCLUDED.email_body,
    sms_body = EXCLUDED.sms_body,
    variables = EXCLUDED.variables,
    category = EXCLUDED.category,
    updated_at = CURRENT_TIMESTAMP;

-- Create indexes for settings tables
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active) WHERE is_active = true;