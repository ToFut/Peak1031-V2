-- ==========================================
-- PRACTICEPANTHER TEST TOKEN INSERTION
-- ==========================================
-- Use this to manually insert known working tokens
-- Replace the token values with actual ones from OAuth flow

-- Insert PracticePanther OAuth tokens
INSERT INTO oauth_tokens (
    provider,
    access_token,
    refresh_token,
    token_type,
    expires_at,
    scope,
    is_active
) VALUES (
    'practicepanther',
    'YOUR_ACCESS_TOKEN_HERE',  -- Replace with actual access token
    'YOUR_REFRESH_TOKEN_HERE', -- Replace with actual refresh token
    'bearer',
    NOW() + INTERVAL '24 hours', -- Token expires in 24 hours
    NULL,
    true
) ON CONFLICT (provider) DO UPDATE SET
    access_token = EXCLUDED.access_token,
    refresh_token = EXCLUDED.refresh_token,
    expires_at = EXCLUDED.expires_at,
    updated_at = NOW(),
    is_active = true;

-- Verify insertion
SELECT 
    id,
    provider,
    LEFT(access_token, 20) || '...' as access_token_preview,
    LEFT(refresh_token, 20) || '...' as refresh_token_preview,
    token_type,
    expires_at,
    is_active,
    created_at
FROM oauth_tokens 
WHERE provider = 'practicepanther';

-- Success message
SELECT 'PracticePanther tokens inserted successfully!' as status;