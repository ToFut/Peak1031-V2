-- Create exchange_permissions table for custom user permissions per exchange
CREATE TABLE IF NOT EXISTS exchange_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    exchange_id UUID NOT NULL REFERENCES exchanges(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Custom permissions (overrides role-based defaults)
    permissions JSONB DEFAULT '{}',
    
    -- Specific permission flags (for easier querying)
    can_view BOOLEAN DEFAULT true,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    can_upload_documents BOOLEAN DEFAULT false,
    can_download_documents BOOLEAN DEFAULT true,
    can_send_messages BOOLEAN DEFAULT false,
    can_add_tasks BOOLEAN DEFAULT false,
    can_edit_tasks BOOLEAN DEFAULT false,
    can_add_participants BOOLEAN DEFAULT false,
    can_view_audit BOOLEAN DEFAULT false,
    can_view_financial BOOLEAN DEFAULT false,
    can_view_compliance BOOLEAN DEFAULT false,
    can_use_pin BOOLEAN DEFAULT false,
    can_delete_documents BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_by UUID REFERENCES users(id),
    
    -- Ensure unique permission per user per exchange
    UNIQUE(exchange_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_exchange_permissions_exchange_id ON exchange_permissions(exchange_id);
CREATE INDEX idx_exchange_permissions_user_id ON exchange_permissions(user_id);
CREATE INDEX idx_exchange_permissions_exchange_user ON exchange_permissions(exchange_id, user_id);

-- Add RLS policies
ALTER TABLE exchange_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own permissions
CREATE POLICY "Users can view own permissions" ON exchange_permissions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Admins can view all permissions
CREATE POLICY "Admins can view all permissions" ON exchange_permissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can insert/update/delete permissions
CREATE POLICY "Admins can manage permissions" ON exchange_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )
    );

-- Policy: Coordinators can view permissions for their exchanges
CREATE POLICY "Coordinators can view exchange permissions" ON exchange_permissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'coordinator'
        )
        AND
        EXISTS (
            SELECT 1 FROM exchange_coordinators
            WHERE exchange_coordinators.exchange_id = exchange_permissions.exchange_id
            AND exchange_coordinators.coordinator_id = auth.uid()
        )
    );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_exchange_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_exchange_permissions_updated_at_trigger
    BEFORE UPDATE ON exchange_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_exchange_permissions_updated_at();

-- Insert default permissions for existing participants (optional, run manually if needed)
-- This will set up initial permissions based on user roles
/*
INSERT INTO exchange_permissions (exchange_id, user_id, can_view, can_edit, can_delete, 
    can_upload_documents, can_download_documents, can_send_messages, can_add_tasks, 
    can_edit_tasks, can_add_participants, can_view_audit, can_view_financial, 
    can_view_compliance, can_use_pin, can_delete_documents, permissions)
SELECT DISTINCT
    ep.exchange_id,
    ep.user_id,
    true, -- can_view
    CASE WHEN u.role IN ('admin', 'coordinator') THEN true ELSE false END, -- can_edit
    CASE WHEN u.role = 'admin' THEN true ELSE false END, -- can_delete
    CASE WHEN u.role IN ('admin', 'coordinator', 'client') THEN true ELSE false END, -- can_upload_documents
    true, -- can_download_documents
    CASE WHEN u.role IN ('admin', 'coordinator', 'client') THEN true ELSE false END, -- can_send_messages
    CASE WHEN u.role IN ('admin', 'coordinator', 'client') THEN true ELSE false END, -- can_add_tasks
    CASE WHEN u.role IN ('admin', 'coordinator') THEN true ELSE false END, -- can_edit_tasks
    CASE WHEN u.role IN ('admin', 'coordinator') THEN true ELSE false END, -- can_add_participants
    CASE WHEN u.role IN ('admin', 'coordinator') THEN true ELSE false END, -- can_view_audit
    CASE WHEN u.role IN ('admin', 'coordinator', 'client') THEN true ELSE false END, -- can_view_financial
    CASE WHEN u.role IN ('admin', 'coordinator', 'client') THEN true ELSE false END, -- can_view_compliance
    CASE WHEN u.role IN ('admin', 'coordinator', 'client') THEN true ELSE false END, -- can_use_pin
    CASE WHEN u.role IN ('admin', 'coordinator') THEN true ELSE false END, -- can_delete_documents
    '{}'::jsonb -- permissions (empty initially)
FROM exchange_participants ep
JOIN users u ON u.id = ep.user_id
WHERE NOT EXISTS (
    SELECT 1 FROM exchange_permissions exp 
    WHERE exp.exchange_id = ep.exchange_id 
    AND exp.user_id = ep.user_id
);
*/