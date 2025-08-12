#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const sampleTemplates = [
  {
    name: '1031 Exchange Agreement',
    description: 'Standard 1031 exchange agreement template with all required clauses and terms',
    category: 'legal',
    template_type: 'document',
    required_fields: ['#Client.Name#', '#Exchange.Number#', '#Property.Address#'],
    is_required: true,
    role_access: ['admin', 'coordinator', 'client'],
    auto_generate: false,
    stage_triggers: [],
    is_active: true,
    version: '1.0',
    tags: ['1031', 'agreement', 'legal'],
    file_template: 'This is a template for 1031 Exchange Agreement between #Client.Name# for exchange #Exchange.Number#',
    settings: {
      autoFill: true,
      requireReview: true,
      allowEditing: false,
      watermark: false
    }
  },
  {
    name: 'Property Identification Notice',
    description: '45-day property identification notice template',
    category: '1031-exchange',
    template_type: 'document',
    required_fields: ['#Client.Name#', '#Exchange.Number#', '#Date.IdentificationDeadline#'],
    is_required: true,
    role_access: ['admin', 'coordinator', 'client'],
    auto_generate: true,
    stage_triggers: ['identification'],
    is_active: true,
    version: '1.0',
    tags: ['1031', 'identification', '45-day'],
    file_template: 'Property Identification Notice for #Client.Name# - Exchange #Exchange.Number#. Deadline: #Date.IdentificationDeadline#',
    settings: {
      autoFill: true,
      requireReview: false,
      allowEditing: true,
      watermark: false
    }
  },
  {
    name: 'Closing Statement',
    description: 'Standard closing statement template for relinquished property',
    category: 'financial',
    template_type: 'document',
    required_fields: ['#Property.Address#', '#Property.SalePrice#', '#Date.RelinquishedClosing#'],
    is_required: false,
    role_access: ['admin', 'coordinator'],
    auto_generate: false,
    stage_triggers: [],
    is_active: true,
    version: '1.0',
    tags: ['closing', 'financial', 'relinquished'],
    file_template: 'Closing Statement for property at #Property.Address#. Sale Price: #Property.SalePrice#',
    settings: {
      autoFill: true,
      requireReview: true,
      allowEditing: false,
      watermark: true
    }
  },
  {
    name: 'QI Authorization Letter',
    description: 'Qualified Intermediary authorization letter template',
    category: 'legal',
    template_type: 'document',
    required_fields: ['#Client.Name#', '#QI.Company#', '#Exchange.Number#'],
    is_required: true,
    role_access: ['admin', 'coordinator'],
    auto_generate: false,
    stage_triggers: [],
    is_active: true,
    version: '1.0',
    tags: ['QI', 'authorization', 'legal'],
    file_template: 'Authorization for #QI.Company# to act as Qualified Intermediary for #Client.Name# in exchange #Exchange.Number#',
    settings: {
      autoFill: true,
      requireReview: true,
      allowEditing: false,
      watermark: false
    }
  },
  {
    name: 'Exchange Timeline Summary',
    description: 'Summary of important dates and deadlines for the exchange',
    category: 'template',
    template_type: 'document',
    required_fields: ['#Date.Start#', '#Date.IdentificationDeadline#', '#Date.CompletionDeadline#'],
    is_required: false,
    role_access: ['admin', 'coordinator', 'client'],
    auto_generate: true,
    stage_triggers: ['started'],
    is_active: true,
    version: '1.0',
    tags: ['timeline', 'summary', 'dates'],
    file_template: 'Exchange Timeline: Start Date: #Date.Start#, 45-Day Deadline: #Date.IdentificationDeadline#, 180-Day Deadline: #Date.CompletionDeadline#',
    settings: {
      autoFill: true,
      requireReview: false,
      allowEditing: true,
      watermark: false
    }
  }
];

async function createSampleTemplates() {
  console.log('🚀 Creating sample templates...');
  
  try {
    // First, check if templates already exist
    const { data: existingTemplates, error: checkError } = await supabase
      .from('document_templates')
      .select('id, name');
    
    if (checkError) {
      console.error('❌ Error checking existing templates:', checkError);
      return;
    }
    
    console.log(`📋 Found ${existingTemplates?.length || 0} existing templates`);
    
    // Get a sample user to use as created_by
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .limit(1);
    
    if (userError || !users || users.length === 0) {
      console.error('❌ No admin user found. Please create an admin user first.');
      return;
    }
    
    const adminUserId = users[0].id;
    console.log(`👤 Using admin user ID: ${adminUserId}`);
    
    // Create each template
    let created = 0;
    let skipped = 0;
    
    for (const template of sampleTemplates) {
      // Check if template with same name already exists
      const exists = existingTemplates?.some(t => t.name === template.name);
      
      if (exists) {
        console.log(`⏭️  Skipping "${template.name}" - already exists`);
        skipped++;
        continue;
      }
      
      // Add created_by and timestamps
      const templateData = {
        ...template,
        created_by: adminUserId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('document_templates')
        .insert(templateData)
        .select()
        .single();
      
      if (error) {
        console.error(`❌ Error creating template "${template.name}":`, error);
      } else {
        console.log(`✅ Created template: ${template.name}`);
        created++;
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   - Created: ${created} templates`);
    console.log(`   - Skipped: ${skipped} templates`);
    console.log(`   - Total: ${existingTemplates?.length + created} templates in database`);
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the script
createSampleTemplates().then(() => {
  console.log('\n✨ Done!');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});