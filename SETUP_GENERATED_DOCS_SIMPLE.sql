-- SIMPLE VERSION - Just create the table and column without RLS policies

-- Create generated_documents table for storing template-generated documents
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES document_templates(id) ON DELETE CASCADE,
  exchange_id UUID REFERENCES exchanges(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  file_path TEXT,
  file_url TEXT,
  generation_data JSONB,
  generated_by UUID REFERENCES people(id),
  status VARCHAR(50) DEFAULT 'completed',
  auto_generated BOOLEAN DEFAULT false,
  trigger_stage VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_generated_docs_exchange ON generated_documents(exchange_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_template ON generated_documents(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_docs_created ON generated_documents(created_at);

-- Add stage_triggers column to document_templates if it doesn't exist
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS stage_triggers TEXT[] DEFAULT '{}';

-- Grant basic permissions (adjust based on your needs)
GRANT ALL ON generated_documents TO authenticated;
GRANT ALL ON generated_documents TO service_role;
GRANT SELECT ON generated_documents TO anon;

COMMENT ON TABLE generated_documents IS 'Stores documents generated from templates with exchange data';
COMMENT ON COLUMN generated_documents.template_id IS 'Reference to the template used for generation';
COMMENT ON COLUMN generated_documents.exchange_id IS 'Exchange this document belongs to';
COMMENT ON COLUMN generated_documents.generation_data IS 'JSON data containing the values used for placeholder replacement';
COMMENT ON COLUMN generated_documents.auto_generated IS 'Whether this was auto-generated based on stage triggers';
COMMENT ON COLUMN generated_documents.trigger_stage IS 'The exchange stage that triggered auto-generation';