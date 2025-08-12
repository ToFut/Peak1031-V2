require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testTemplates() {
  try {
    console.log('🔍 Testing document_templates table...');
    
    // Check if document_templates table exists
    console.log('📋 Checking if document_templates table exists...');
    const { data: templates, error } = await supabase
      .from('document_templates')
      .select('*')
      .limit(10);

    if (error) {
      console.error('❌ Error accessing document_templates table:', error.message);
      
      // Check what tables exist
      console.log('\n🔍 Checking available tables...');
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_tables');
      
      if (tablesError) {
        console.log('❌ Could not get table list:', tablesError.message);
      } else {
        console.log('📋 Available tables:', tables);
      }
      
      return;
    }

    console.log(`✅ document_templates table exists!`);
    console.log(`📊 Found ${templates?.length || 0} templates:`);

    if (templates && templates.length > 0) {
      templates.forEach((template, index) => {
        console.log(`\n${index + 1}. Template: ${template.name}`);
        console.log(`   ID: ${template.id}`);
        console.log(`   Description: ${template.description || 'No description'}`);
        console.log(`   Category: ${template.category || 'No category'}`);
        console.log(`   Active: ${template.is_active ? 'Yes' : 'No'}`);
        console.log(`   Created: ${template.created_at}`);
        console.log(`   Updated: ${template.updated_at}`);
      });
    } else {
      console.log('❌ No templates found in database');
      
      // Let's create a sample template
      console.log('\n🔧 Creating a sample template...');
      const sampleTemplate = {
        name: 'Sample 1031 Exchange Agreement',
        description: 'A sample template for 1031 exchange agreements',
        category: 'legal',
        template_type: 'document',
        version: '1.0',
        file_template: 'This is a sample template for #Client.Name# with exchange #Exchange.ID#',
        required_fields: ['#Client.Name#', '#Exchange.ID#'],
        is_required: false,
        role_access: ['admin', 'coordinator'],
        auto_generate: false,
        stage_triggers: [],
        is_active: true,
        tags: ['sample', 'legal'],
        settings: {
          autoFill: true,
          requireReview: false,
          allowEditing: true,
          watermark: false
        }
      };

      const { data: newTemplate, error: createError } = await supabase
        .from('document_templates')
        .insert(sampleTemplate)
        .select()
        .single();

      if (createError) {
        console.error('❌ Error creating sample template:', createError.message);
      } else {
        console.log('✅ Sample template created successfully!');
        console.log('📋 Template ID:', newTemplate.id);
        console.log('📋 Template Name:', newTemplate.name);
      }
    }

    // Check the table structure
    console.log('\n🔍 Checking table structure...');
    const { data: structure, error: structureError } = await supabase
      .from('document_templates')
      .select('*')
      .limit(1);

    if (structureError) {
      console.error('❌ Error checking table structure:', structureError.message);
    } else if (structure && structure.length > 0) {
      console.log('📋 Table columns:', Object.keys(structure[0]));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testTemplates();


