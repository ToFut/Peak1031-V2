/**
 * Debug Script for Template Availability
 * Checks why templates aren't showing in the frontend
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugTemplates() {
  console.log('🔍 Template Debugging Script\n');
  console.log('=' .repeat(50));
  
  try {
    // Step 1: Check if templates exist in database
    console.log('\n📋 Step 1: Checking templates in database...');
    const { data: allTemplates, error: allError } = await supabase
      .from('document_templates')
      .select('*');
    
    if (allError) {
      console.error('❌ Error fetching templates:', allError);
      return;
    }
    
    console.log(`✅ Found ${allTemplates?.length || 0} total templates in database`);
    
    if (allTemplates && allTemplates.length > 0) {
      console.log('\n📊 Template Summary:');
      allTemplates.forEach((template, index) => {
        console.log(`  ${index + 1}. ${template.name}`);
        console.log(`     - ID: ${template.id}`);
        console.log(`     - Active: ${template.is_active}`);
        console.log(`     - Category: ${template.category || 'N/A'}`);
        console.log(`     - Type: ${template.template_type || 'N/A'}`);
        console.log(`     - Has file_template: ${!!template.file_template}`);
        console.log(`     - Has file_path: ${!!template.file_path}`);
      });
    }
    
    // Step 2: Check active templates (what the API returns)
    console.log('\n📋 Step 2: Checking active templates...');
    const { data: activeTemplates, error: activeError } = await supabase
      .from('document_templates')
      .select('*')
      .eq('is_active', true);
    
    if (activeError) {
      console.error('❌ Error fetching active templates:', activeError);
    } else {
      console.log(`✅ Found ${activeTemplates?.length || 0} active templates`);
    }
    
    // Step 3: Create a test template if none exist
    if (!allTemplates || allTemplates.length === 0) {
      console.log('\n📋 Step 3: No templates found. Creating test templates...');
      
      const testTemplates = [
        {
          name: 'Exchange Agreement',
          description: 'Standard 1031 exchange agreement template',
          template_type: 'exchange_agreement',
          category: 'exchange',
          is_active: true,
          is_required: false,
          auto_generate: false,
          file_template: `
# 1031 Exchange Agreement

**Exchange Number:** #Exchange.Number#
**Date:** #Date.Current#

## Parties
**Client:** #Client.Name#
**Email:** #Client.Email#
**Phone:** #Client.Phone#

## Exchange Details
**Exchange Type:** #Exchange.Type#
**Exchange Value:** #Exchange.Value#
**Status:** #Exchange.Status#

## Property Information
**Relinquished Property:** #Property.RelinquishedAddress#
**Sale Price:** #Property.SalePrice#

## Coordinator
**Name:** #Coordinator.Name#
**Email:** #Coordinator.Email#

---
Generated on #System.CurrentDate# by #System.GeneratedBy#
          `,
          placeholders: {
            exchange: ['number', 'type', 'value', 'status'],
            client: ['name', 'email', 'phone'],
            property: ['address', 'salePrice'],
            coordinator: ['name', 'email']
          }
        },
        {
          name: 'Identification Notice',
          description: '45-day identification notice template',
          template_type: 'identification_notice',
          category: 'notice',
          is_active: true,
          is_required: true,
          auto_generate: false,
          file_template: `
# 45-DAY IDENTIFICATION NOTICE

**Date:** #Date.Current#
**Exchange ID:** #Exchange.Number#

To: #QI.Name#

This letter serves as our formal identification of replacement property for the above-referenced exchange.

**Exchanger:** #Client.Name#
**Relinquished Property:** #Property.RelinquishedAddress#

We hereby identify the following replacement property:
#Property.ReplacementAddress#

Sincerely,
#Client.Name#
          `,
          placeholders: {
            exchange: ['number'],
            client: ['name'],
            property: ['relinquishedAddress', 'replacementAddress'],
            qi: ['name']
          }
        },
        {
          name: 'Assignment Agreement',
          description: 'Assignment of purchase and sale agreement',
          template_type: 'assignment',
          category: 'agreement',
          is_active: true,
          is_required: false,
          auto_generate: false,
          file_template: `
# ASSIGNMENT AGREEMENT

This Assignment Agreement is entered into on #Date.Current#

BETWEEN:
**Assignor:** #Client.Name#
**Assignee:** #QI.Name#

**Property:** #Property.Address#
**Purchase Price:** #Property.SalePrice#

The Assignor hereby assigns all rights under the Purchase and Sale Agreement to the Assignee.

_____________________
#Client.Name#
Date: #Date.Current#
          `,
          placeholders: {
            client: ['name'],
            property: ['address', 'salePrice'],
            qi: ['name'],
            date: ['current']
          }
        }
      ];
      
      for (const template of testTemplates) {
        const { data: newTemplate, error: createError } = await supabase
          .from('document_templates')
          .insert([template])
          .select()
          .single();
        
        if (createError) {
          console.error(`❌ Failed to create template "${template.name}":`, createError.message);
        } else {
          console.log(`✅ Created template: ${newTemplate.name} (ID: ${newTemplate.id})`);
        }
      }
    }
    
    // Step 4: Test the API endpoint directly
    console.log('\n📋 Step 4: Testing API endpoint response format...');
    
    // Simulate what the documents route does
    const templates = activeTemplates || allTemplates || [];
    const formattedTemplates = templates.map(template => {
      let templateData = {};
      let tags = [];
      let compatibility = {
        exchanges: ['all'],
        roles: ['admin', 'coordinator'],
        requirements: []
      };
      let settings = {
        autoFill: true,
        requireReview: false,
        allowEditing: true,
        expiresAfterDays: 30,
        watermark: false
      };

      try {
        if (template.template_data && typeof template.template_data === 'string') {
          templateData = JSON.parse(template.template_data);
        } else if (template.template_data && typeof template.template_data === 'object') {
          templateData = template.template_data;
        }
      } catch (e) {
        // Ignore parse errors
      }

      return {
        id: template.id,
        name: template.name,
        description: template.description || '',
        category: template.category || 'general',
        type: template.type || 'pdf',
        version: template.version || '1.0.0',
        isActive: template.is_active !== false,
        isDefault: template.is_default === true,
        tags,
        fields: templateData.fields || [],
        metadata: {
          author: template.created_by || 'System',
          createdAt: template.created_at,
          updatedAt: template.updated_at,
          lastUsed: template.last_used,
          usageCount: template.usage_count || 0
        },
        compatibility,
        settings
      };
    });
    
    console.log('\n📊 API Response Format (first template):');
    if (formattedTemplates.length > 0) {
      console.log(JSON.stringify(formattedTemplates[0], null, 2));
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎯 Debugging Summary:');
    console.log('=' .repeat(50));
    console.log(`  - Total templates in DB: ${allTemplates?.length || 0}`);
    console.log(`  - Active templates: ${activeTemplates?.length || 0}`);
    console.log(`  - API would return: ${formattedTemplates.length} templates`);
    
    if (formattedTemplates.length === 0) {
      console.log('\n⚠️ No templates available! Frontend will show empty list.');
      console.log('💡 Solution: Run this script again to create test templates.');
    } else {
      console.log('\n✅ Templates are available in the database.');
      console.log('💡 If frontend still shows no templates, check:');
      console.log('   1. Authentication token is valid');
      console.log('   2. Network tab for API errors');
      console.log('   3. Console for JavaScript errors');
      console.log('   4. Backend server is running');
    }
    
  } catch (error) {
    console.error('\n❌ Debug script failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the debug script
debugTemplates().catch(console.error);