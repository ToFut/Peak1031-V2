-- Create tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pp_task_id VARCHAR(100) UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'PENDING',
  priority VARCHAR(10) DEFAULT 'MEDIUM',
  exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES users(id),
  due_date DATE,
  completed_at TIMESTAMP,
  pp_data JSONB DEFAULT '{}',
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_tasks_pp_task_id ON tasks(pp_task_id);
CREATE INDEX idx_tasks_exchange_id ON tasks(exchange_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_last_sync ON tasks(last_sync_at);

-- Create trigger to update updated_at
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 