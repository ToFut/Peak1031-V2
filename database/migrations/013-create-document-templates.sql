-- Create document_templates table for admin-uploaded template documents
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(10),
    file_size INTEGER,
    mime_type VARCHAR(100),
    url TEXT,
    category VARCHAR(50) DEFAULT 'template',
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_by ON document_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_document_templates_created_at ON document_templates(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for document_templates
-- Admin can do everything
CREATE POLICY "Admins can manage all template documents" ON document_templates
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'admin' OR 
        auth.jwt() ->> 'user_role' = 'admin'
    );

-- Coordinators can read all templates
CREATE POLICY "Coordinators can read template documents" ON document_templates
    FOR SELECT
    USING (
        auth.jwt() ->> 'role' IN ('coordinator', 'admin') OR 
        auth.jwt() ->> 'user_role' IN ('coordinator', 'admin')
    );

-- Other authenticated users can read templates
CREATE POLICY "Authenticated users can read template documents" ON document_templates
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Add comments for documentation
COMMENT ON TABLE document_templates IS 'Template documents uploaded by administrators for use in exchanges';
COMMENT ON COLUMN document_templates.name IS 'Display name of the template document';
COMMENT ON COLUMN document_templates.description IS 'Description of when and how to use this template';
COMMENT ON COLUMN document_templates.file_path IS 'Path to file in Supabase storage';
COMMENT ON COLUMN document_templates.url IS 'Public URL to access the document';
COMMENT ON COLUMN document_templates.category IS 'Category of template (e.g., agreement, form, checklist)';