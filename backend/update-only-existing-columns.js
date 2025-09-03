require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateOnlyExistingColumns() {
  console.log('🔄 Updating only existing table columns with PP data...\n');

  try {
    // Get current exchange to see what fields exist
    const { data: currentExchange } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7')
      .single();

    if (!currentExchange) {
      console.log('❌ Exchange not found');
      return;
    }

    const ppData = currentExchange.pp_data;
    const customFields = ppData.custom_field_values || [];

    console.log('📋 Available table columns:');
    const tableColumns = Object.keys(currentExchange);
    console.log(tableColumns.slice(0, 20).join(', '), '... and more');

    // Helper function to get custom field value
    const getCustomFieldValue = (label) => {
      const field = customFields.find(f => f.custom_field_ref.label === label);
      if (!field) return null;
      return field.value_string || field.value_number || field.value_date_time || 
             (field.contact_ref ? field.contact_ref.display_name : null);
    };

    // Map only to columns that exist in the table
    const updateData = {};

    // Check each PP field and map to existing columns
    const mappings = [
      // PP Field Label → Table Column
      ['Client Vesting', 'client_vesting'],
      ['Bank', 'bank'],
      ['Proceeds', 'proceeds'],
      ['Day 45', 'day_45'],
      ['Day 180', 'day_180'],
      ['Rel Property Address', 'rel_property_address'],
      ['Rel Escrow Number', 'rel_escrow_number'],
      ['Rel Value', 'rel_value'],
      ['Type of Exchange', 'type_of_exchange'],
      ['Rep 1 Property Address', 'rep_1_property_address'],
      ['Rep 1 Value', 'rep_1_value'],
      ['Referral Source', 'referral_source'],
      ['Buyer Vesting', 'buyer_vesting'],
      ['Buyer 1 Name', 'buyer_1_name'],
      ['Rel APN', 'rel_apn']
    ];

    console.log('\n🔄 Checking mappings:');
    mappings.forEach(([ppLabel, columnName]) => {
      const value = getCustomFieldValue(ppLabel);
      if (value && tableColumns.includes(columnName)) {
        updateData[columnName] = value;
        console.log(`  ✅ ${columnName}: ${value}`);
      } else if (value && !tableColumns.includes(columnName)) {
        console.log(`  ⚠️ ${columnName}: Column doesn't exist (value: ${value})`);
      } else {
        console.log(`  ❌ ${ppLabel}: No value found`);
      }
    });

    if (Object.keys(updateData).length === 0) {
      console.log('\n❌ No mappable fields found');
      return;
    }

    // Add timestamp
    updateData.updated_at = new Date().toISOString();

    console.log(`\n🔄 Updating ${Object.keys(updateData).length} fields...`);

    // Update the database
    const { error } = await supabase
      .from('exchanges')
      .update(updateData)
      .eq('id', currentExchange.id);

    if (error) {
      console.log('\n❌ Update failed:', error.message);
    } else {
      console.log('\n✅ Successfully updated exchange with PP data!');
      
      // Verify the update
      const { data: updated } = await supabase
        .from('exchanges')
        .select(Object.keys(updateData).join(','))
        .eq('id', currentExchange.id)
        .single();
      
      if (updated) {
        console.log('\n📋 Verification - Updated fields:');
        Object.keys(updateData).forEach(key => {
          if (key !== 'updated_at') {
            console.log(`  ✅ ${key}: ${updated[key]}`);
          }
        });
      }
    }

    console.log('\n🎯 NOW THE FRONTEND SHOULD DISPLAY:');
    console.log('• Client Vesting: Hector Kicelian as Trustee...');
    console.log('• Bank: Israel Discount Bank');
    console.log('• Day 45: 2025-08-11');
    console.log('• Day 180: 2025-12-24');
    console.log('• Relinquished Property: 860 London Green Way...');
    console.log('• Replacement Property: 535 Roswell Avenue...');
    console.log('• All other PP custom field data');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

updateOnlyExistingColumns();