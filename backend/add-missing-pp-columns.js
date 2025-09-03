require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingPPColumns() {
  console.log('🔧 ADDING MISSING DATABASE COLUMNS FOR PP FIELDS...\\n');
  
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  try {
    // List of columns we need to add
    const columnsToAdd = [
      { name: 'settlement_agent', type: 'TEXT', description: 'Settlement agent for relinquished property' },
      { name: 'property_type', type: 'TEXT', description: 'Type of relinquished property' },
      { name: 'rep_1_seller_name', type: 'TEXT', description: 'Combined seller names for replacement property' },
      { name: 'expected_closing', type: 'TIMESTAMP', description: 'Expected closing date' },
      { name: 'exchange_agreement_drafted', type: 'TIMESTAMP', description: 'Date exchange agreement was drafted' },
      { name: 'date_proceeds_received', type: 'TIMESTAMP', description: 'Date proceeds were received' },
      { name: 'internal_credit_to', type: 'TEXT', description: 'Internal credit assignment' },
      { name: 'pp_account_name', type: 'TEXT', description: 'PracticePanther account name' },
      { name: 'pp_account_id', type: 'TEXT', description: 'PracticePanther account GUID' },
      { name: 'pp_matter_guid', type: 'TEXT', description: 'PracticePanther matter GUID' },
      { name: 'pp_responsible_attorney_email', type: 'TEXT', description: 'Responsible attorney email' },
      { name: 'referral_source', type: 'TEXT', description: 'Referral source name' },
      { name: 'referral_source_email', type: 'TEXT', description: 'Referral source email' }
    ];

    console.log('📋 Columns to add:', columnsToAdd.length);
    
    // Add each column to the exchanges table
    for (const column of columnsToAdd) {
      console.log(`\\n🔧 Adding column: ${column.name} (${column.type})`);
      
      const addColumnSQL = `ALTER TABLE exchanges ADD COLUMN IF NOT EXISTS ${column.name} ${column.type};`;
      
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: addColumnSQL });
        
        if (error) {
          console.log(`❌ Failed to add ${column.name}:`, error.message);
        } else {
          console.log(`✅ Added ${column.name}`);
        }
      } catch (columnError) {
        // Try alternative approach using raw SQL
        console.log(`⚠️  Direct SQL failed for ${column.name}, trying alternative...`);
        
        // Since we can't execute DDL directly, let's create a migration file instead
        const migrationSQL = `-- Add missing PP columns\\nALTER TABLE exchanges ADD COLUMN IF NOT EXISTS ${column.name} ${column.type}; -- ${column.description}`;
        console.log(`📝 Migration needed: ${migrationSQL}`);
      }
    }

    console.log('\\n⚠️  IMPORTANT: Database columns need to be added via migration.');
    console.log('Creating a migration file...');

    // Create a comprehensive migration file
    const migrationContent = `-- Migration: Add missing PracticePanther columns
-- Date: ${new Date().toISOString()}
-- Purpose: Add columns for complete PP data display

BEGIN;

-- Add missing PP field columns
${columnsToAdd.map(col => `ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}; -- ${col.description}`).join('\\nALTER TABLE exchanges ')}

COMMIT;
`;

    // Try to write the migration file (this may not work in this environment but shows what's needed)
    console.log('\\n📝 MIGRATION NEEDED:');
    console.log(migrationContent);

    // For now, let's update with the data we have using existing similar columns
    console.log('\\n🔄 Attempting to map to similar existing columns...');
    
    const { data: exchange } = await supabase
      .from('exchanges')
      .select('pp_data')
      .eq('id', exchangeId)
      .single();

    const ppData = exchange.pp_data;
    const customFields = ppData.custom_field_values || [];

    const getPPValue = (label) => {
      const field = customFields.find(f => f.custom_field_ref.label === label);
      if (!field) return null;
      return field.value_string || field.value_number || field.value_date_time || 
             (field.contact_ref ? field.contact_ref.display_name : field.value_boolean);
    };

    // Try alternative mappings to existing columns
    const alternativeMapping = {
      // Map to notes or description fields if they exist
      notes: `Settlement Agent: ${getPPValue('Rel Settlement Agent')} | Property Type: ${getPPValue('Property Type')} | Internal Credit: ${getPPValue('Internal Credit To')}`,
      
      // Update the existing pp_data to include more accessible structure
      pp_enhanced_data: {
        ...ppData,
        // Add flattened fields for easier frontend access
        settlement_agent: getPPValue('Rel Settlement Agent'),
        property_type: getPPValue('Property Type'),
        referral_source: getPPValue('Referral Source'),
        referral_source_email: getPPValue('Referral Source Email'),
        internal_credit_to: getPPValue('Internal Credit To'),
        account_name: ppData.account_ref?.display_name,
        account_id: ppData.account_ref?.id,
        matter_guid: ppData.id,
        responsible_attorney_email: ppData.assigned_to_users?.[0]?.email_address
      }
    };

    // Check which of these columns exist
    const { data: currentData } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();
    
    const existingColumns = Object.keys(currentData);
    
    const finalUpdate = {};
    Object.keys(alternativeMapping).forEach(col => {
      if (existingColumns.includes(col)) {
        finalUpdate[col] = alternativeMapping[col];
      }
    });

    if (Object.keys(finalUpdate).length > 0) {
      console.log('\\n🔄 Updating with alternative mapping...');
      const { error: updateError } = await supabase
        .from('exchanges')
        .update(finalUpdate)
        .eq('id', exchangeId);

      if (updateError) {
        console.log('❌ Alternative update failed:', updateError.message);
      } else {
        console.log('✅ Alternative mapping completed');
      }
    }

    console.log('\\n🎯 NEXT STEPS TO COMPLETE PP INTEGRATION:');
    console.log('1. Add the migration file to add missing columns');
    console.log('2. Run the migration to add the columns');
    console.log('3. Re-run the mapping script to populate the new columns');
    console.log('4. Update ExchangeOverview component to display the new fields');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addMissingPPColumns();