-- Exchange-Specific Permission System
-- Comprehensive role-based access control for documents, tasks, messages, and other features

-- Create permission types enum
DO $$ BEGIN
    CREATE TYPE permission_type_enum AS ENUM (
        'view_overview',        -- Can see exchange overview/summary
        'view_messages',        -- Can see messages/chat
        'send_messages',        -- Can send messages
        'view_tasks',          -- Can see tasks
        'create_tasks',        -- Can create tasks
        'edit_tasks',          -- Can edit tasks
        'assign_tasks',        -- Can assign tasks to others
        'view_documents',      -- Can see documents
        'upload_documents',    -- Can upload documents
        'edit_documents',      -- Can edit/replace documents
        'delete_documents',    -- Can delete documents
        'view_participants',   -- Can see other participants
        'manage_participants', -- Can add/remove participants
        'view_financial',      -- Can see financial information
        'edit_financial',      -- Can edit financial information
        'view_timeline',       -- Can see exchange timeline/milestones
        'edit_timeline',       -- Can edit timeline/milestones
        'view_reports',        -- Can generate/view reports
        'admin_exchange'       -- Full admin access to exchange
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create access level enum
DO $$ BEGIN
    CREATE TYPE access_level_enum AS ENUM ('none', 'read', 'write', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Create user exchange permissions table
CREATE TABLE IF NOT EXISTS public.user_exchange_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    permission_type permission_type_enum NOT NULL,
    granted BOOLEAN DEFAULT true,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, exchange_id, permission_type)
);

-- Create permission templates for different user roles
CREATE TABLE IF NOT EXISTS public.permission_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    role_type user_role_enum,
    permissions JSONB NOT NULL, -- Array of permission_type_enum values
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    organization_id UUID REFERENCES organizations(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create exchange access levels table (simplified access control)
CREATE TABLE IF NOT EXISTS public.user_exchange_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
    access_level access_level_enum DEFAULT 'read',
    custom_permissions JSONB DEFAULT '{}', -- Override specific permissions
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, exchange_id)
);

-- Create document access control table
CREATE TABLE IF NOT EXISTS public.document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    access_level access_level_enum DEFAULT 'read',
    can_download BOOLEAN DEFAULT true,
    can_share BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

-- Create task assignments with enhanced permissions
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'exchange', -- 'exchange', 'assigned_only', 'private'
ADD COLUMN IF NOT EXISTS can_view_by JSONB DEFAULT '[]', -- Array of user IDs who can view
ADD COLUMN IF NOT EXISTS can_edit_by JSONB DEFAULT '[]', -- Array of user IDs who can edit
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Create message access control
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS visibility VARCHAR(50) DEFAULT 'exchange', -- 'exchange', 'private', 'thread'
ADD COLUMN IF NOT EXISTS thread_participants JSONB DEFAULT '[]', -- For private threads
ADD COLUMN IF NOT EXISTS is_system_message BOOLEAN DEFAULT false;

-- Insert default permission templates
INSERT INTO public.permission_templates (name, description, role_type, permissions, is_default)
VALUES 
-- Admin template
('Exchange Administrator', 'Full access to all exchange features', 'admin', 
 '["view_overview", "view_messages", "send_messages", "view_tasks", "create_tasks", "edit_tasks", "assign_tasks", "view_documents", "upload_documents", "edit_documents", "delete_documents", "view_participants", "manage_participants", "view_financial", "edit_financial", "view_timeline", "edit_timeline", "view_reports", "admin_exchange"]'::jsonb, 
 true),

-- Coordinator template  
('Exchange Coordinator', 'Manage exchange operations and participants', 'coordinator',
 '["view_overview", "view_messages", "send_messages", "view_tasks", "create_tasks", "edit_tasks", "assign_tasks", "view_documents", "upload_documents", "edit_documents", "view_participants", "manage_participants", "view_financial", "view_timeline", "edit_timeline", "view_reports"]'::jsonb,
 true),

-- Client template
('Client', 'Standard client access to exchange information', 'client',
 '["view_overview", "view_messages", "send_messages", "view_tasks", "view_documents", "upload_documents", "view_participants", "view_timeline"]'::jsonb,
 true),

-- Third Party template  
('Third Party Professional', 'Limited access for attorneys, agents, etc.', 'third_party',
 '["view_overview", "view_messages", "send_messages", "view_tasks", "view_documents", "upload_documents", "view_participants"]'::jsonb,
 true),

-- Agency template
('Agency User', 'Agency-level access across multiple exchanges', 'agency',
 '["view_overview", "view_messages", "send_messages", "view_tasks", "create_tasks", "edit_tasks", "view_documents", "upload_documents", "view_participants", "view_reports"]'::jsonb,
 true),

-- Custom templates for specific roles
('Attorney', 'Legal professional access', 'third_party',
 '["view_overview", "view_messages", "send_messages", "view_documents", "upload_documents", "view_financial", "view_timeline"]'::jsonb,
 false),

('Title Company', 'Title company specific access', 'third_party',
 '["view_overview", "view_messages", "send_messages", "view_documents", "upload_documents", "view_timeline"]'::jsonb,
 false),

('Inspector', 'Property inspector access', 'third_party',
 '["view_overview", "view_messages", "send_messages", "view_tasks", "view_documents", "upload_documents"]'::jsonb,
 false),

('Read Only Observer', 'View-only access for observers', 'client',
 '["view_overview", "view_messages", "view_tasks", "view_documents", "view_participants", "view_timeline"]'::jsonb,
 false);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_exchange_permissions_user_exchange ON public.user_exchange_permissions(user_id, exchange_id);
CREATE INDEX IF NOT EXISTS idx_user_exchange_permissions_permission ON public.user_exchange_permissions(permission_type);
CREATE INDEX IF NOT EXISTS idx_user_exchange_access_user ON public.user_exchange_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_exchange_access_exchange ON public.user_exchange_access(exchange_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_document ON public.document_permissions(document_id);
CREATE INDEX IF NOT EXISTS idx_document_permissions_user ON public.document_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_visibility ON public.tasks(visibility);
CREATE INDEX IF NOT EXISTS idx_messages_visibility ON public.messages(visibility);

-- Enable RLS
ALTER TABLE public.user_exchange_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_exchange_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own exchange permissions" 
ON public.user_exchange_permissions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all permissions" 
ON public.user_exchange_permissions FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'coordinator')
    )
);

CREATE POLICY "Users can view their own exchange access" 
ON public.user_exchange_access FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage exchange access" 
ON public.user_exchange_access FOR ALL 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role IN ('admin', 'coordinator')
    )
);

CREATE POLICY "Users can view document permissions for their documents" 
ON public.document_permissions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on permission tables" 
ON public.user_exchange_permissions FOR ALL 
TO service_role USING (true);

CREATE POLICY "Service role full access on exchange access" 
ON public.user_exchange_access FOR ALL 
TO service_role USING (true);

CREATE POLICY "Service role full access on document permissions" 
ON public.document_permissions FOR ALL 
TO service_role USING (true);

CREATE POLICY "Service role full access on permission templates" 
ON public.permission_templates FOR ALL 
TO service_role USING (true);

-- Create functions for permission checking
CREATE OR REPLACE FUNCTION check_user_permission(
    user_uuid UUID,
    exchange_uuid UUID,
    permission_name TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := false;
    user_access_level TEXT;
BEGIN
    -- Check if user has specific permission
    SELECT granted INTO has_permission
    FROM user_exchange_permissions 
    WHERE user_id = user_uuid 
    AND exchange_id = exchange_uuid 
    AND permission_type = permission_name::permission_type_enum
    AND granted = true
    AND (expires_at IS NULL OR expires_at > NOW());
    
    -- If specific permission found, return it
    IF has_permission IS NOT NULL THEN
        RETURN has_permission;
    END IF;
    
    -- Check access level and determine permission
    SELECT access_level INTO user_access_level
    FROM user_exchange_access
    WHERE user_id = user_uuid 
    AND exchange_id = exchange_uuid
    AND is_active = true;
    
    -- Determine permission based on access level
    CASE user_access_level
        WHEN 'admin' THEN
            RETURN true;
        WHEN 'write' THEN
            RETURN permission_name NOT LIKE '%delete%' AND permission_name NOT LIKE 'admin_%';
        WHEN 'read' THEN
            RETURN permission_name LIKE 'view_%';
        ELSE
            RETURN false;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user accessible exchanges
CREATE OR REPLACE FUNCTION get_user_accessible_exchanges(user_uuid UUID)
RETURNS TABLE (
    exchange_id UUID,
    access_level TEXT,
    permissions JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uea.exchange_id,
        uea.access_level::TEXT,
        COALESCE(
            jsonb_agg(
                DISTINCT uep.permission_type
            ) FILTER (WHERE uep.permission_type IS NOT NULL),
            '[]'::jsonb
        ) as permissions
    FROM user_exchange_access uea
    LEFT JOIN user_exchange_permissions uep ON (
        uep.user_id = uea.user_id 
        AND uep.exchange_id = uea.exchange_id 
        AND uep.granted = true
        AND (uep.expires_at IS NULL OR uep.expires_at > NOW())
    )
    WHERE uea.user_id = user_uuid
    AND uea.is_active = true
    GROUP BY uea.exchange_id, uea.access_level;
END;
$$ LANGUAGE plpgsql;

-- Create function to apply permission template to user
CREATE OR REPLACE FUNCTION apply_permission_template(
    template_name_param TEXT,
    user_uuid UUID,
    exchange_uuid UUID,
    granted_by_uuid UUID DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    template_record RECORD;
    permission_item TEXT;
BEGIN
    -- Get template
    SELECT * INTO template_record
    FROM permission_templates 
    WHERE name = template_name_param AND is_active = true;
    
    IF NOT FOUND THEN
        RETURN false;
    END IF;
    
    -- Clear existing permissions for this user/exchange
    DELETE FROM user_exchange_permissions 
    WHERE user_id = user_uuid AND exchange_id = exchange_uuid;
    
    -- Apply template permissions
    FOR permission_item IN 
        SELECT jsonb_array_elements_text(template_record.permissions)
    LOOP
        INSERT INTO user_exchange_permissions (
            user_id, exchange_id, permission_type, granted, granted_by, granted_at
        ) VALUES (
            user_uuid, exchange_uuid, permission_item::permission_type_enum, 
            true, granted_by_uuid, NOW()
        ) ON CONFLICT (user_id, exchange_id, permission_type) 
        DO UPDATE SET 
            granted = true,
            granted_by = granted_by_uuid,
            granted_at = NOW();
    END LOOP;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-assign default permissions when user is added to exchange
CREATE OR REPLACE FUNCTION auto_assign_default_permissions()
RETURNS TRIGGER AS $$
DECLARE
    default_template TEXT;
    user_role TEXT;
BEGIN
    -- Get user role
    SELECT role INTO user_role FROM users WHERE id = NEW.user_id;
    
    -- Determine default template based on role
    CASE user_role
        WHEN 'admin' THEN default_template := 'Exchange Administrator';
        WHEN 'coordinator' THEN default_template := 'Exchange Coordinator';
        WHEN 'client' THEN default_template := 'Client';
        WHEN 'third_party' THEN default_template := 'Third Party Professional';
        WHEN 'agency' THEN default_template := 'Agency User';
        ELSE default_template := 'Client';
    END CASE;
    
    -- Apply default template
    PERFORM apply_permission_template(default_template, NEW.user_id, NEW.exchange_id, NEW.assigned_by);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_assign_permissions
    AFTER INSERT ON public.user_exchange_access
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_default_permissions();