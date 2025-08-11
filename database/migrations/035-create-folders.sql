-- Create folders table
CREATE TABLE folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  parent_id UUID REFERENCES folders(id) ON DELETE CASCADE,
  exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add folder_id to documents table
ALTER TABLE documents ADD COLUMN folder_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_folders_exchange_id ON folders(exchange_id);
CREATE INDEX idx_folders_parent_id ON folders(parent_id);
CREATE INDEX idx_folders_created_by ON folders(created_by);
CREATE INDEX idx_documents_folder_id ON documents(folder_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_folders_updated_at BEFORE UPDATE ON folders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample folders for existing exchanges
INSERT INTO folders (name, exchange_id, created_by) 
SELECT 
  'General Documents' as name,
  e.id as exchange_id,
  e.coordinator_id as created_by
FROM exchanges e
WHERE e.id NOT IN (SELECT DISTINCT exchange_id FROM folders WHERE name = 'General Documents');

-- Insert additional sample folders
INSERT INTO folders (name, exchange_id, created_by) 
SELECT 
  'Contracts' as name,
  e.id as exchange_id,
  e.coordinator_id as created_by
FROM exchanges e
WHERE e.id NOT IN (SELECT DISTINCT exchange_id FROM folders WHERE name = 'Contracts');

INSERT INTO folders (name, exchange_id, created_by) 
SELECT 
  'Financial Records' as name,
  e.id as exchange_id,
  e.coordinator_id as created_by
FROM exchanges e
WHERE e.id NOT IN (SELECT DISTINCT exchange_id FROM folders WHERE name = 'Financial Records');

INSERT INTO folders (name, exchange_id, created_by) 
SELECT 
  'Legal Documents' as name,
  e.id as exchange_id,
  e.coordinator_id as created_by
FROM exchanges e
WHERE e.id NOT IN (SELECT DISTINCT exchange_id FROM folders WHERE name = 'Legal Documents');




