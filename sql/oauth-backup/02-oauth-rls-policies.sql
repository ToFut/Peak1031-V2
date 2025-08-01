-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================
-- Security policies for oauth_tokens table
-- Run this after creating the table

-- Enable Row Level Security
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can manage oauth tokens" ON oauth_tokens;
DROP POLICY IF EXISTS "Authenticated users can read oauth tokens" ON oauth_tokens;

-- Create new policies
CREATE POLICY "Service role can manage oauth tokens" ON oauth_tokens
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can read oauth tokens" ON oauth_tokens
    FOR SELECT TO authenticated USING (true);

-- Grant necessary permissions
GRANT ALL ON oauth_tokens TO service_role;
GRANT SELECT ON oauth_tokens TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role, authenticated;

-- Success message
SELECT 'RLS policies applied successfully!' as status;