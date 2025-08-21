-- Create sync_logs table for PracticePanther sync tracking
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'running' CHECK (status IN ('running', 'success', 'error', 'partial')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  records_processed INTEGER DEFAULT 0,
  records_created INTEGER DEFAULT 0,
  records_updated INTEGER DEFAULT 0,
  error_message TEXT,
  details JSONB DEFAULT '{}',
  triggered_by VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_type ON public.sync_logs(sync_type);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started ON public.sync_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_triggered_by ON public.sync_logs(triggered_by);

-- Create update trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_sync_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger
DROP TRIGGER IF EXISTS update_sync_logs_updated_at ON public.sync_logs;
CREATE TRIGGER update_sync_logs_updated_at
  BEFORE UPDATE ON public.sync_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_sync_logs_updated_at();

-- Add comments for documentation
COMMENT ON TABLE public.sync_logs IS 'Tracks PracticePanther sync operations and their results';
COMMENT ON COLUMN public.sync_logs.sync_type IS 'Type of sync: contacts, matters, tasks, full';
COMMENT ON COLUMN public.sync_logs.status IS 'Sync status: running, success, error, partial';
COMMENT ON COLUMN public.sync_logs.details IS 'Additional sync details and statistics in JSON format';
