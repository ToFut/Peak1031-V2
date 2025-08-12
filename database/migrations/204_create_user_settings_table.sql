-- =================================================================
-- CREATE USER_SETTINGS TABLE FOR USER PREFERENCES
-- =================================================================

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Theme and Display Preferences
    theme VARCHAR(20) DEFAULT 'light' CHECK (theme IN ('light', 'dark', 'auto')),
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    date_format VARCHAR(20) DEFAULT 'MM/DD/YYYY',
    
    -- Notification Preferences
    notifications JSONB DEFAULT '{
        "email": true,
        "push": true,
        "sms": false,
        "deadlineAlerts": true,
        "taskAssignments": true,
        "exchangeUpdates": true,
        "weeklyDigest": true
    }',
    
    -- Dashboard Configuration
    dashboard JSONB DEFAULT '{
        "layout": "default",
        "widgets": ["recent_exchanges", "pending_tasks", "notifications"],
        "compactView": false,
        "showWelcomeMessage": true
    }',
    
    -- Other Preferences
    preferences JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Foreign Key Constraint
    CONSTRAINT fk_user_settings_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Create unique constraint - one settings record per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_settings_unique_user 
    ON user_settings(user_id);

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_settings_updated_at();

-- Insert default settings for existing users (if any)
INSERT INTO user_settings (user_id)
SELECT id FROM users 
WHERE NOT EXISTS (
    SELECT 1 FROM user_settings WHERE user_settings.user_id = users.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Grant permissions for RLS if enabled
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policy - users can only access their own settings
CREATE POLICY user_settings_policy ON user_settings
    FOR ALL 
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());