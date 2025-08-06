const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function runMigration() {
  try {
    console.log('🔄 Running template category migration...');
    
    // First check if column exists
    const { data: columns, error: checkError } = await supabase
      .from('document_templates')
      .select('*')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Error checking table:', checkError);
      return;
    }
    
    // Update existing templates with default category
    const { data: templates, error: fetchError } = await supabase
      .from('document_templates')
      .select('*');
      
    if (fetchError) {
      console.error('❌ Error fetching templates:', fetchError);
      return;
    }
    
    console.log(`📋 Found ${templates?.length || 0} templates to update`);
    
    // Update each template with appropriate category
    for (const template of templates || []) {
      if (!template.category || template.category === 'other') {
        const name = template.name.toLowerCase();
        let category = 'other';
        
        if (name.includes('exchange') || name.includes('agreement')) {
          category = 'exchange-agreement';
        } else if (name.includes('1031') || name.includes('form')) {
          category = '1031-forms';
        } else if (name.includes('property') || name.includes('deed')) {
          category = 'property-documents';
        } else if (name.includes('tax') || name.includes('w2') || name.includes('1099')) {
          category = 'tax-documents';
        } else if (name.includes('legal') || name.includes('contract')) {
          category = 'legal-documents';
        } else if (name.includes('compliance') || name.includes('regulation')) {
          category = 'compliance-forms';
        }
        
        const { error: updateError } = await supabase
          .from('document_templates')
          .update({ category })
          .eq('id', template.id);
          
        if (updateError) {
          console.error(`❌ Error updating template ${template.id}:`, updateError);
        } else {
          console.log(`✅ Updated template "${template.name}" to category: ${category}`);
        }
      }
    }
    
    console.log('✅ Migration completed successfully');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

runMigration();