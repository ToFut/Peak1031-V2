-- Add metadata field to tasks table
ALTER TABLE tasks ADD COLUMN metadata JSONB DEFAULT '{}';

-- Add index for metadata queries
CREATE INDEX idx_tasks_metadata ON tasks USING GIN (metadata);

-- Add comment explaining the metadata field
COMMENT ON COLUMN tasks.metadata IS 'Additional task metadata including notify_all_users flag and other custom properties';
