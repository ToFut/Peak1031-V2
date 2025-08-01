-- ==========================================
-- OAUTH TOKENS TABLE CREATION
-- ==========================================
-- Core table for storing OAuth 2.0 tokens from PracticePanther
-- Run this first when setting up a new Supabase account

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

-- Add performance indexes
CREATE INDEX idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX idx_oauth_tokens_active ON oauth_tokens(provider, is_active);
CREATE INDEX idx_oauth_tokens_expires ON oauth_tokens(expires_at);

-- Success message
SELECT 'oauth_tokens table created successfully!' as status;