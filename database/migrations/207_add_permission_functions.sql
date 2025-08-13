-- Add missing permission checking functions
-- This migration adds the database functions required by the permission middleware

-- Function to check if a user has a specific permission for an exchange
CREATE OR REPLACE FUNCTION public.check_user_permission(
    exchange_uuid UUID,
    permission_name TEXT,
    user_uuid UUID
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
BEGIN
    -- Check if user has the specific permission for this exchange
    SELECT EXISTS(
        SELECT 1 
        FROM user_exchange_permissions uep
        WHERE uep.user_id = user_uuid
        AND uep.exchange_id = exchange_uuid
        AND uep.permission_type::text = permission_name
        AND uep.is_active = TRUE
        AND (uep.expires_at IS NULL OR uep.expires_at > NOW())
    ) INTO has_permission;

    -- If no direct permission found, check if user is admin (admins have all permissions)
    IF NOT has_permission THEN
        SELECT EXISTS(
            SELECT 1 
            FROM users u
            WHERE u.id = user_uuid
            AND u.role = 'admin'
            AND u.is_active = TRUE
        ) INTO has_permission;
    END IF;

    RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all permissions for a user on an exchange
CREATE OR REPLACE FUNCTION public.get_user_exchange_permissions(
    user_uuid UUID,
    exchange_uuid UUID
) RETURNS TABLE(
    permission_type TEXT,
    granted_at TIMESTAMP,
    expires_at TIMESTAMP,
    granted_by UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uep.permission_type::text,
        uep.granted_at,
        uep.expires_at,
        uep.granted_by
    FROM user_exchange_permissions uep
    WHERE uep.user_id = user_uuid
    AND uep.exchange_id = exchange_uuid
    AND uep.is_active = TRUE
    AND (uep.expires_at IS NULL OR uep.expires_at > NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all exchanges accessible to a user
CREATE OR REPLACE FUNCTION public.get_user_accessible_exchanges(
    user_uuid UUID
) RETURNS TABLE(
    exchange_id UUID,
    exchange_name TEXT,
    access_level TEXT,
    permissions TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        e.id as exchange_id,
        e.exchange_name,
        uea.access_level::text,
        ARRAY(
            SELECT uep.permission_type::text
            FROM user_exchange_permissions uep
            WHERE uep.user_id = user_uuid
            AND uep.exchange_id = e.id
            AND uep.is_active = TRUE
            AND (uep.expires_at IS NULL OR uep.expires_at > NOW())
        ) as permissions
    FROM exchanges e
    LEFT JOIN user_exchange_access uea ON e.id = uea.exchange_id AND uea.user_id = user_uuid
    WHERE EXISTS(
        SELECT 1 
        FROM user_exchange_permissions uep
        WHERE uep.user_id = user_uuid
        AND uep.exchange_id = e.id
        AND uep.is_active = TRUE
        AND (uep.expires_at IS NULL OR uep.expires_at > NOW())
    )
    OR EXISTS(
        SELECT 1 
        FROM users u
        WHERE u.id = user_uuid
        AND u.role = 'admin'
        AND u.is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can access an exchange
CREATE OR REPLACE FUNCTION public.can_user_access_exchange(
    user_uuid UUID,
    exchange_uuid UUID
) RETURNS BOOLEAN AS $$
DECLARE
    can_access BOOLEAN := FALSE;
BEGIN
    -- Check if user has any permission for this exchange
    SELECT EXISTS(
        SELECT 1 
        FROM user_exchange_permissions uep
        WHERE uep.user_id = user_uuid
        AND uep.exchange_id = exchange_uuid
        AND uep.is_active = TRUE
        AND (uep.expires_at IS NULL OR uep.expires_at > NOW())
    ) INTO can_access;

    -- If no direct access, check if user is admin
    IF NOT can_access THEN
        SELECT EXISTS(
            SELECT 1 
            FROM users u
            WHERE u.id = user_uuid
            AND u.role = 'admin'
            AND u.is_active = TRUE
        ) INTO can_access;
    END IF;

    RETURN can_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.check_user_permission(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_exchange_permissions(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_exchanges(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_user_access_exchange(UUID, UUID) TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_exchange_permissions_lookup ON user_exchange_permissions(user_id, exchange_id, permission_type, is_active);
CREATE INDEX IF NOT EXISTS idx_user_exchange_permissions_active ON user_exchange_permissions(is_active, expires_at);
CREATE INDEX IF NOT EXISTS idx_user_exchange_access_lookup ON user_exchange_access(user_id, exchange_id, access_level);

COMMENT ON FUNCTION public.check_user_permission IS 'Check if a user has a specific permission for an exchange';
COMMENT ON FUNCTION public.get_user_exchange_permissions IS 'Get all permissions for a user on a specific exchange';
COMMENT ON FUNCTION public.get_user_accessible_exchanges IS 'Get all exchanges accessible to a user with their permissions';
COMMENT ON FUNCTION public.can_user_access_exchange IS 'Check if a user can access an exchange';