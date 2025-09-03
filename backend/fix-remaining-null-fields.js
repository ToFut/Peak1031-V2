require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixRemainingNullFields() {
  console.log('🔧 Fixing remaining NULL fields with PP data...\\n');
  
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  try {
    // Get the PP data again to map the specific fields
    const { data: exchange } = await supabase
      .from('exchanges')
      .select('pp_data')
      .eq('id', exchangeId)
      .single();

    const customFields = exchange.pp_data.custom_field_values || [];

    // Helper function to get custom field value
    const getCustomFieldValue = (label) => {
      const field = customFields.find(f => f.custom_field_ref.label === label);
      if (!field) return null;
      return field.value_string || field.value_number || field.value_date_time || 
             (field.contact_ref ? field.contact_ref.display_name : field.value_boolean);
    };

    // Show what we have for the missing fields
    console.log('📋 Checking specific missing field values in PP data:');
    console.log('Rel APN:', JSON.stringify(getCustomFieldValue('Rel APN')));
    console.log('Rel Contract Date:', JSON.stringify(getCustomFieldValue('Rel Contract Date')));
    console.log('Property Type:', JSON.stringify(getCustomFieldValue('Property Type')));
    console.log('Expected Rel Closing Date:', JSON.stringify(getCustomFieldValue('Expected Rel Closing Date')));

    // Target the specific NULL fields
    const updateData = {
      rel_apn: getCustomFieldValue('Rel APN'),
      rel_contract_date: getCustomFieldValue('Rel Contract Date'),
      updated_at: new Date().toISOString()
    };

    // Remove null values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === null || updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    console.log('\\n🔄 Updating fields:', Object.keys(updateData));
    
    if (Object.keys(updateData).length <= 1) { // Only updated_at
      console.log('❌ No valid data found for NULL fields');
      return;
    }

    // Update the database
    const { error } = await supabase
      .from('exchanges')
      .update(updateData)
      .eq('id', exchangeId);

    if (error) {
      console.log('\\n❌ Update failed:', error.message);
    } else {
      console.log('\\n✅ Successfully updated NULL fields!');
      
      // Verify the fix
      const { data: updated } = await supabase
        .from('exchanges')
        .select('rel_apn, rel_contract_date')
        .eq('id', exchangeId)
        .single();
      
      console.log('\\n📋 Verification:');
      console.log('✅ rel_apn:', updated.rel_apn || 'Still NULL');
      console.log('✅ rel_contract_date:', updated.rel_contract_date || 'Still NULL');
    }

    // Final summary
    console.log('\\n🎯 COMPLETE FIELD STATUS AFTER ALL MAPPING:');
    console.log('==============================================');
    
    const { data: finalData } = await supabase
      .from('exchanges')
      .select('client_vesting, bank, day_45, day_180, proceeds, rel_property_address, rel_value, rel_apn, rel_contract_date, rep_1_property_address, rep_1_value, buyer_1_name, type_of_exchange')
      .eq('id', exchangeId)
      .single();
    
    const finalFields = [
      ['✅ Client Vesting', finalData.client_vesting ? '✅ SHOWING' : '❌ NULL'],
      ['✅ Bank', finalData.bank ? '✅ SHOWING' : '❌ NULL'],
      ['✅ Day 45', finalData.day_45 ? '✅ SHOWING' : '❌ NULL'],
      ['✅ Day 180', finalData.day_180 ? '✅ SHOWING' : '❌ NULL'],
      ['✅ Proceeds', finalData.proceeds ? '✅ SHOWING' : '❌ NULL'],
      ['✅ Relinquished Address', finalData.rel_property_address ? '✅ SHOWING' : '❌ NULL'],
      ['✅ Relinquished Value', finalData.rel_value ? '✅ SHOWING' : '❌ NULL'],
      ['🔧 Relinquished APN', finalData.rel_apn ? '✅ FIXED' : '❌ Still NULL'],
      ['🔧 Contract Date', finalData.rel_contract_date ? '✅ FIXED' : '❌ Still NULL'],
      ['✅ Replacement Address', finalData.rep_1_property_address ? '✅ SHOWING' : '❌ NULL'],
      ['✅ Replacement Value', finalData.rep_1_value ? '✅ SHOWING' : '❌ NULL'],
      ['✅ Buyer 1 Name', finalData.buyer_1_name ? '✅ SHOWING' : '❌ NULL'],
      ['✅ Exchange Type', finalData.type_of_exchange ? '✅ SHOWING' : '❌ NULL']
    ];
    
    finalFields.forEach(([field, status]) => {
      console.log(`${field}: ${status}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixRemainingNullFields();