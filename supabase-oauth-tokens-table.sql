-- Create table for storing PracticePanther OAuth tokens
CREATE TABLE IF NOT EXISTS pp_oauth_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_type VARCHAR(50) DEFAULT 'bearer',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one token per user
    UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pp_oauth_tokens_user_id ON pp_oauth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_pp_oauth_tokens_expires_at ON pp_oauth_tokens(expires_at);

-- Enable Row Level Security (RLS)
ALTER TABLE pp_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only access their own tokens
CREATE POLICY "Users can view their own OAuth tokens" ON pp_oauth_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own OAuth tokens" ON pp_oauth_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own OAuth tokens" ON pp_oauth_tokens
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own OAuth tokens" ON pp_oauth_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pp_oauth_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_pp_oauth_tokens_updated_at_trigger
    BEFORE UPDATE ON pp_oauth_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_pp_oauth_tokens_updated_at();

-- Grant necessary permissions
GRANT ALL ON pp_oauth_tokens TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated; 