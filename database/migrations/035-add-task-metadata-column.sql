-- Migration: Add metadata column to tasks table for rollover history tracking
-- Date: 2025-08-21
-- Purpose: Enable task rollover feature to track history of rolled over tasks

-- Add metadata column if it doesn't exist
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add index for better performance on metadata queries
CREATE INDEX IF NOT EXISTS idx_tasks_metadata 
ON tasks USING GIN (metadata);

-- Add comment to document the column purpose
COMMENT ON COLUMN tasks.metadata IS 'Stores additional task data including rollover history, custom fields, and other metadata';

-- Example metadata structure:
-- {
--   "rollover_history": [
--     {
--       "original_due_date": "2025-08-20",
--       "new_due_date": "2025-08-21",
--       "rolled_over_at": "2025-08-21T00:00:00Z",
--       "days_overdue": 1,
--       "rolled_over_by": "system-cron"
--     }
--   ],
--   "rollover_count": 1,
--   "last_rollover_date": "2025-08-21T00:00:00Z",
--   "custom_fields": {},
--   "tags": []
-- }