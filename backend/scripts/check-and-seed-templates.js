const supabaseService = require('../services/supabase');

async function checkAndSeedTemplates() {
  try {
    console.log('Checking document_templates table...');
    
    // Check if templates exist
    const existingTemplates = await supabaseService.select('document_templates', {});
    
    console.log(`Found ${existingTemplates?.length || 0} existing templates`);
    
    if (!existingTemplates || existingTemplates.length === 0) {
      console.log('No templates found. Seeding default 1031 exchange templates...');
      
      const defaultTemplates = [
        {
          name: '1031 Exchange Agreement',
          description: 'Comprehensive 1031 like-kind exchange agreement template with all required IRS compliance elements',
          category: '1031_exchange',
          type: 'pdf',
          template_data: {
            fields: [
              { name: 'exchanger_name', label: 'Exchanger Name', type: 'text', required: true },
              { name: 'relinquished_property', label: 'Relinquished Property Address', type: 'text', required: true },
              { name: 'replacement_property', label: 'Replacement Property Address', type: 'text', required: false },
              { name: 'exchange_start_date', label: 'Exchange Start Date', type: 'date', required: true },
              { name: 'identification_deadline', label: '45-Day Identification Deadline', type: 'date', required: true },
              { name: 'exchange_deadline', label: '180-Day Exchange Deadline', type: 'date', required: true }
            ]
          },
          is_active: true,
          is_default: true,
          version: '1.0.0'
        },
        {
          name: '45-Day Identification Notice',
          description: 'Official 45-day identification notice for replacement properties in 1031 exchange',
          category: '1031_exchange',
          type: 'pdf',
          template_data: {
            fields: [
              { name: 'qualified_intermediary', label: 'Qualified Intermediary Name', type: 'text', required: true },
              { name: 'exchanger_name', label: 'Exchanger Name', type: 'text', required: true },
              { name: 'identification_date', label: 'Identification Date', type: 'date', required: true },
              { name: 'property_1', label: 'Identified Property 1', type: 'text', required: true },
              { name: 'property_2', label: 'Identified Property 2', type: 'text', required: false },
              { name: 'property_3', label: 'Identified Property 3', type: 'text', required: false }
            ]
          },
          is_active: true,
          is_default: false,
          version: '1.0.0'
        },
        {
          name: 'Assignment of Purchase Agreement',
          description: 'Assignment document for transferring purchase rights to qualified intermediary',
          category: 'legal',
          type: 'pdf',
          template_data: {
            fields: [
              { name: 'assignor_name', label: 'Assignor Name', type: 'text', required: true },
              { name: 'assignee_name', label: 'Assignee Name (QI)', type: 'text', required: true },
              { name: 'property_address', label: 'Property Address', type: 'text', required: true },
              { name: 'purchase_price', label: 'Purchase Price', type: 'currency', required: true },
              { name: 'assignment_date', label: 'Assignment Date', type: 'date', required: true }
            ]
          },
          is_active: true,
          is_default: false,
          version: '1.0.0'
        },
        {
          name: 'Exchange Funds Receipt',
          description: 'Receipt for exchange funds held by qualified intermediary',
          category: 'financial',
          type: 'pdf',
          template_data: {
            fields: [
              { name: 'exchanger_name', label: 'Exchanger Name', type: 'text', required: true },
              { name: 'amount_received', label: 'Amount Received', type: 'currency', required: true },
              { name: 'receipt_date', label: 'Receipt Date', type: 'date', required: true },
              { name: 'property_sold', label: 'Property Sold', type: 'text', required: true },
              { name: 'escrow_number', label: 'Escrow Number', type: 'text', required: false }
            ]
          },
          is_active: true,
          is_default: false,
          version: '1.0.0'
        }
      ];
      
      // Insert templates
      for (const template of defaultTemplates) {
        try {
          await supabaseService.insert('document_templates', template);
          console.log(`✓ Inserted template: ${template.name}`);
        } catch (insertError) {
          console.error(`Error inserting template ${template.name}:`, insertError);
        }
      }
      
      console.log('Template seeding completed!');
    } else {
      console.log('\nExisting templates:');
      existingTemplates.forEach(t => {
        console.log(`- ${t.name} (${t.category}) - Active: ${t.is_active}`);
      });
    }
    
  } catch (error) {
    console.error('Error in check and seed process:', error);
  }
  
  process.exit(0);
}

checkAndSeedTemplates();