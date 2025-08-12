-- Add missing template configuration fields to document_templates table
-- This migration adds the settings and configuration fields needed for proper template management

-- Add settings JSONB field for template configuration
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}';

-- Add required_fields JSONB for template field requirements
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS required_fields JSONB DEFAULT '[]';

-- Add role_access JSONB for role-based access control
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS role_access JSONB DEFAULT '[]';

-- Add auto_generate boolean for automatic document generation
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS auto_generate BOOLEAN DEFAULT false;

-- Add stage_triggers array for workflow stage triggers (keep as TEXT[] for compatibility)
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS stage_triggers TEXT[] DEFAULT '{}';

-- Add is_required boolean for mandatory templates
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT false;

-- Add is_active boolean for template status
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add version field for template versioning
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS version VARCHAR(20) DEFAULT '1.0';

-- Add template_type field for different template types
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS template_type VARCHAR(50) DEFAULT 'document';

-- Add tags JSONB for template categorization
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- Add file_template field for template content (for text-based templates)
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS file_template TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_document_templates_settings ON document_templates USING GIN (settings);
CREATE INDEX IF NOT EXISTS idx_document_templates_required_fields ON document_templates USING GIN (required_fields);
CREATE INDEX IF NOT EXISTS idx_document_templates_role_access ON document_templates USING GIN (role_access);
CREATE INDEX IF NOT EXISTS idx_document_templates_stage_triggers ON document_templates USING GIN (stage_triggers);
CREATE INDEX IF NOT EXISTS idx_document_templates_tags ON document_templates USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_document_templates_auto_generate ON document_templates(auto_generate);
CREATE INDEX IF NOT EXISTS idx_document_templates_is_active ON document_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_document_templates_template_type ON document_templates(template_type);

-- Add comments for documentation
COMMENT ON COLUMN document_templates.settings IS 'JSON configuration for template settings (autoFill, requireReview, allowEditing, watermark, etc.)';
COMMENT ON COLUMN document_templates.required_fields IS 'Array of required fields that must be filled for this template';
COMMENT ON COLUMN document_templates.role_access IS 'Array of roles that can access this template';
COMMENT ON COLUMN document_templates.auto_generate IS 'Whether this template should be auto-generated for exchanges';
COMMENT ON COLUMN document_templates.stage_triggers IS 'Array of exchange stages that trigger this template generation';
COMMENT ON COLUMN document_templates.is_required IS 'Whether this template is mandatory for exchanges';
COMMENT ON COLUMN document_templates.is_active IS 'Whether this template is active and available for use';
COMMENT ON COLUMN document_templates.version IS 'Template version for versioning control';
COMMENT ON COLUMN document_templates.template_type IS 'Type of template (document, form, agreement, etc.)';
COMMENT ON COLUMN document_templates.tags IS 'Array of tags for template categorization';
COMMENT ON COLUMN document_templates.file_template IS 'Template content for text-based templates';

-- Update existing templates with default settings
UPDATE document_templates 
SET 
    settings = '{"autoFill": true, "requireReview": false, "allowEditing": true, "watermark": false}'::jsonb,
    required_fields = '["#Exchange.ID#", "#Client.Name#"]'::jsonb,
    role_access = '["admin", "coordinator"]'::jsonb,
    auto_generate = false,
    stage_triggers = ARRAY[]::text[],
    is_required = false,
    is_active = true,
    version = '1.0',
    template_type = 'document',
    tags = '["template"]'::jsonb,
    file_template = NULL
WHERE settings IS NULL;
