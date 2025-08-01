-- Create exchanges table
CREATE TABLE exchanges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pp_matter_id VARCHAR(100) UNIQUE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  client_id UUID REFERENCES contacts(id),
  coordinator_id UUID REFERENCES users(id),
  start_date DATE,
  completion_date DATE,
  pp_data JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  last_sync_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_exchanges_pp_matter_id ON exchanges(pp_matter_id);
CREATE INDEX idx_exchanges_status ON exchanges(status);
CREATE INDEX idx_exchanges_client_id ON exchanges(client_id);
CREATE INDEX idx_exchanges_coordinator_id ON exchanges(coordinator_id);
CREATE INDEX idx_exchanges_start_date ON exchanges(start_date);
CREATE INDEX idx_exchanges_last_sync ON exchanges(last_sync_at);
CREATE INDEX idx_exchanges_is_active ON exchanges(is_active);

-- Create trigger to update updated_at
CREATE TRIGGER update_exchanges_updated_at BEFORE UPDATE ON exchanges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 