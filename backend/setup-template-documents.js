require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function setupTemplateDocuments() {
  console.log('🔧 Setting up template documents system...');
  
  try {
    // 1. Check if documents bucket exists
    console.log('\n📁 Checking storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
    } else {
      console.log('✅ Found buckets:', buckets.map(b => b.name));
      
      const documentsBucket = buckets.find(b => b.name === 'documents');
      if (!documentsBucket) {
        console.log('📁 Creating documents bucket...');
        const { data, error } = await supabase.storage.createBucket('documents', {
          public: false,
          allowedMimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv',
            'application/zip',
            'application/x-zip-compressed'
          ],
          fileSizeLimit: 52428800 // 50MB
        });
        
        if (error) {
          console.error('❌ Error creating bucket:', error);
        } else {
          console.log('✅ Documents bucket created successfully');
        }
      } else {
        console.log('✅ Documents bucket already exists');
      }
    }
    
    // 2. Check if document_templates table exists
    console.log('\n📊 Checking document_templates table...');
    const { data: templates, error: tableError } = await supabase
      .from('document_templates')
      .select('*')
      .limit(1);
    
    if (tableError) {
      if (tableError.code === '42P01') {
        console.log('⚠️ Table document_templates does not exist');
        console.log('\n📝 Please create the table with this SQL:');
        console.log(`
CREATE TABLE document_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'template',
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  tags TEXT[],
  metadata JSONB,
  uploaded_by UUID REFERENCES people(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index for faster lookups
CREATE INDEX idx_document_templates_category ON document_templates(category);
CREATE INDEX idx_document_templates_uploaded_by ON document_templates(uploaded_by);

-- Add RLS policies
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read templates
CREATE POLICY "Templates are viewable by authenticated users" ON document_templates
  FOR SELECT
  USING (auth.role() IS NOT NULL);

-- Policy: Only admins can insert templates
CREATE POLICY "Only admins can create templates" ON document_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM people 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy: Only admins can update templates
CREATE POLICY "Only admins can update templates" ON document_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM people 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy: Only admins can delete templates
CREATE POLICY "Only admins can delete templates" ON document_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM people 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );
        `);
      } else {
        console.error('❌ Error checking table:', tableError);
      }
    } else {
      console.log('✅ Table document_templates exists');
      console.log(`📊 Found ${templates?.length || 0} existing templates`);
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

setupTemplateDocuments();