-- ==========================================
-- SUPABASE SCHEMA CACHE REFRESH FIX
-- ==========================================
-- This SQL forces Supabase to refresh its PostgREST API cache
-- so the oauth_tokens table becomes immediately accessible
-- Use this if tables aren't showing up in API after creation

-- Step 1: Drop table if it exists (clean slate)
DROP TABLE IF EXISTS public.oauth_tokens CASCADE;

-- Step 2: Create the table with all required columns
CREATE TABLE public.oauth_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(20) DEFAULT 'Bearer',
    expires_at TIMESTAMP WITH TIME ZONE,
    scope TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Add performance indexes
CREATE INDEX idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX idx_oauth_tokens_active ON oauth_tokens(provider, is_active);
CREATE INDEX idx_oauth_tokens_expires ON oauth_tokens(expires_at);

-- Step 4: Enable Row Level Security
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies (no IF NOT EXISTS to avoid syntax errors)
DROP POLICY IF EXISTS "Service role can manage oauth tokens" ON oauth_tokens;
CREATE POLICY "Service role can manage oauth tokens" ON oauth_tokens
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can read oauth tokens" ON oauth_tokens;
CREATE POLICY "Authenticated users can read oauth tokens" ON oauth_tokens
    FOR SELECT TO authenticated USING (true);

-- Step 6: Force PostgREST schema cache reload
-- This is the key part that fixes the cache issue
NOTIFY pgrst, 'reload schema';

-- Step 7: Insert a test record to verify table is working
INSERT INTO oauth_tokens (provider, access_token, token_type, is_active) 
VALUES ('test_provider', 'test_token_123', 'Bearer', false);

-- Step 8: Immediately delete the test record
DELETE FROM oauth_tokens WHERE provider = 'test_provider';

-- Step 9: Grant necessary permissions (belt and suspenders approach)
GRANT ALL ON oauth_tokens TO service_role;
GRANT SELECT ON oauth_tokens TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role, authenticated;

-- Step 10: Final verification query
SELECT 
    tablename,
    schemaname,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename = 'oauth_tokens' AND schemaname = 'public';

-- Success message
SELECT 'oauth_tokens table created and cache refreshed successfully!' as status;