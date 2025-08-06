const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkGeneratedDocsTable() {
  console.log('🔍 Checking generated_documents table...\n');

  try {
    // Try to query the table
    const { data, error } = await supabase
      .from('generated_documents')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Table does not exist or error accessing it:', error.message);
      console.log('\n📋 Creating generated_documents table...');
      
      // Create the table using SQL
      const { data: createData, error: createError } = await supabase.rpc('exec_sql', {
        sql: `
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
          
          -- Create indexes
          CREATE INDEX IF NOT EXISTS idx_generated_docs_exchange ON generated_documents(exchange_id);
          CREATE INDEX IF NOT EXISTS idx_generated_docs_template ON generated_documents(template_id);
          CREATE INDEX IF NOT EXISTS idx_generated_docs_created ON generated_documents(created_at);
        `
      });

      if (createError) {
        // Try alternative approach without rpc
        console.log('⚠️ Could not create via RPC, table needs to be created manually');
        console.log('\n📝 SQL to create the table:');
        console.log(`
CREATE TABLE generated_documents (
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

CREATE INDEX idx_generated_docs_exchange ON generated_documents(exchange_id);
CREATE INDEX idx_generated_docs_template ON generated_documents(template_id);
CREATE INDEX idx_generated_docs_created ON generated_documents(created_at);
        `);
      } else {
        console.log('✅ Table created successfully!');
      }
    } else {
      console.log('✅ Table exists and is accessible');
      console.log(`📊 Found ${data?.length || 0} documents in the table`);
    }

    // Check if document_templates has stage_triggers column
    const { data: templateData, error: templateError } = await supabase
      .from('document_templates')
      .select('*')
      .limit(1);

    if (templateError) {
      console.log('\n❌ Error checking document_templates:', templateError.message);
    } else if (templateData && templateData.length > 0) {
      const hasStageTriggersColumn = 'stage_triggers' in templateData[0];
      if (!hasStageTriggersColumn) {
        console.log('\n⚠️ document_templates table missing stage_triggers column');
        console.log('📝 SQL to add the column:');
        console.log(`
ALTER TABLE document_templates 
ADD COLUMN IF NOT EXISTS stage_triggers TEXT[] DEFAULT '{}';
        `);
      } else {
        console.log('\n✅ document_templates table has stage_triggers column');
      }
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkGeneratedDocsTable();