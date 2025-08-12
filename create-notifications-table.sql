-- Create notifications table for Peak 1031 application
-- Run this in the Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  urgency VARCHAR(50) DEFAULT 'medium',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  related_exchange_id UUID REFERENCES exchanges(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_related_exchange_id ON public.notifications(related_exchange_id);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user access
CREATE POLICY IF NOT EXISTS "Users can only see their own notifications" 
ON public.notifications 
FOR SELECT 
USING (auth.uid()::text = user_id::text);

CREATE POLICY IF NOT EXISTS "Users can only update their own notifications" 
ON public.notifications 
FOR UPDATE 
USING (auth.uid()::text = user_id::text);

-- Allow service role to insert notifications (for backend API)
CREATE POLICY IF NOT EXISTS "Service role can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Allow service role to read all notifications (for admin purposes)
CREATE POLICY IF NOT EXISTS "Service role can read all notifications" 
ON public.notifications 
FOR SELECT 
USING (true);

-- Add a trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at 
BEFORE UPDATE ON public.notifications 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add some sample data for testing (optional)
-- INSERT INTO public.notifications (user_id, type, title, message, urgency) VALUES 
-- ((SELECT id FROM users LIMIT 1), 'welcome', 'Welcome!', 'Welcome to Peak 1031!', 'medium');