-- Add category column to document_templates table
ALTER TABLE document_templates
ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'other';

-- Update existing templates with appropriate categories based on name
UPDATE document_templates 
SET category = CASE
    WHEN LOWER(name) LIKE '%exchange%' OR LOWER(name) LIKE '%agreement%' THEN 'exchange-agreement'
    WHEN LOWER(name) LIKE '%1031%' OR LOWER(name) LIKE '%form%' THEN '1031-forms'
    WHEN LOWER(name) LIKE '%property%' OR LOWER(name) LIKE '%deed%' THEN 'property-documents'
    WHEN LOWER(name) LIKE '%tax%' OR LOWER(name) LIKE '%w2%' OR LOWER(name) LIKE '%1099%' THEN 'tax-documents'
    WHEN LOWER(name) LIKE '%legal%' OR LOWER(name) LIKE '%contract%' THEN 'legal-documents'
    WHEN LOWER(name) LIKE '%compliance%' OR LOWER(name) LIKE '%regulation%' THEN 'compliance-forms'
    ELSE 'other'
END
WHERE category IS NULL OR category = 'other';

-- Create index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_document_templates_category ON document_templates(category);