-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type VARCHAR(100),
  exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  category VARCHAR(50),
  tags JSONB DEFAULT '[]',
  pin_required BOOLEAN DEFAULT false,
  pin_hash VARCHAR(255),
  is_template BOOLEAN DEFAULT false,
  template_data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_documents_exchange_id ON documents(exchange_id);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_pin_required ON documents(pin_required);
CREATE INDEX idx_documents_is_template ON documents(is_template);
CREATE INDEX idx_documents_created_at ON documents(created_at);

-- Create trigger to update updated_at
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 