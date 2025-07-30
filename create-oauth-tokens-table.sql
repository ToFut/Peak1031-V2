-- Create OAuth tokens table for storing PracticePanther tokens
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.oauth_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  provider TEXT NOT NULL, -- 'practicepanther', 'clio', etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,
  is_active BOOLEAN DEFAULT true,
  user_id UUID REFERENCES public.users(id), -- Optional: associate with specific user
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON public.oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_is_active ON public.oauth_tokens(is_active);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires_at ON public.oauth_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_id ON public.oauth_tokens(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_oauth_tokens_updated_at 
  BEFORE UPDATE ON public.oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can manage OAuth tokens
CREATE POLICY "Only admins can view oauth tokens" ON public.oauth_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can manage oauth tokens" ON public.oauth_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Allow service role to manage tokens (for backend operations)
CREATE POLICY "Service role can manage oauth tokens" ON public.oauth_tokens
  FOR ALL USING (auth.role() = 'service_role');