-- Migration: Create audit_logs table for comprehensive activity tracking
-- This table is essential for tracking all user actions and system events

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    status VARCHAR(20) DEFAULT 'success',
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_audit_logs_user_id (user_id),
    INDEX idx_audit_logs_action (action),
    INDEX idx_audit_logs_entity (entity_type, entity_id),
    INDEX idx_audit_logs_created_at (created_at DESC),
    INDEX idx_audit_logs_status (status)
);

-- Create trigger for automatic timestamp
CREATE OR REPLACE FUNCTION update_audit_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.created_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail for all user actions and system events';
COMMENT ON COLUMN audit_logs.user_id IS 'User who performed the action';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (login, create, update, delete, etc)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (exchange, document, user, etc)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN audit_logs.details IS 'Additional JSON data about the action';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the request';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/client information';
COMMENT ON COLUMN audit_logs.status IS 'Success or failure status of the action';
COMMENT ON COLUMN audit_logs.error_message IS 'Error details if action failed';
COMMENT ON COLUMN audit_logs.duration_ms IS 'Time taken to complete the action in milliseconds';