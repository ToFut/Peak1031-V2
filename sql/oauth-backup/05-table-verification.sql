-- ==========================================
-- TABLE VERIFICATION & DIAGNOSTICS
-- ==========================================
-- Run this to verify oauth_tokens table is working correctly

-- Check if table exists
SELECT 
    tablename,
    schemaname,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables 
WHERE tablename = 'oauth_tokens' AND schemaname = 'public';

-- Check table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'oauth_tokens' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'oauth_tokens' 
AND schemaname = 'public';

-- Check RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'oauth_tokens' 
AND schemaname = 'public';

-- Check current token count
SELECT 
    provider,
    COUNT(*) as token_count,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_tokens,
    MAX(created_at) as last_token_created,
    MAX(expires_at) as next_expiry
FROM oauth_tokens 
GROUP BY provider;

-- Test basic operations
-- Insert test record
INSERT INTO oauth_tokens (provider, access_token, token_type, is_active) 
VALUES ('test_verification', 'test_token_456', 'Bearer', false);

-- Query test record
SELECT * FROM oauth_tokens WHERE provider = 'test_verification';

-- Delete test record
DELETE FROM oauth_tokens WHERE provider = 'test_verification';

-- Final success message
SELECT 'Table verification completed successfully!' as status;