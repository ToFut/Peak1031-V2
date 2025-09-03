require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function finalPPMapping() {
  console.log('🎯 Final PP field mapping to existing database columns...\\n');
  
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  try {
    // Get the exchange with PP data
    const { data: exchange } = await supabase
      .from('exchanges')
      .select('id, pp_data')
      .eq('id', exchangeId)
      .single();

    const ppData = exchange.pp_data;
    const customFields = ppData.custom_field_values || [];

    // Helper function to get custom field value
    const getCustomFieldValue = (label) => {
      const field = customFields.find(f => f.custom_field_ref.label === label);
      if (!field) return null;
      return field.value_string || field.value_number || field.value_date_time || 
             (field.contact_ref ? field.contact_ref.display_name : field.value_boolean);
    };

    // Map to existing columns that we identified
    const updateData = {
      // Missing key fields that exist in database
      rel_apn: getCustomFieldValue('Rel APN'), // Column EXISTS: "65061-09-175"
      rel_contract_date: getCustomFieldValue('Rel Contract Date'), // Column EXISTS: "2025-05-27T00:00:00"
      rel_purchase_contract_title: getCustomFieldValue('Rel Purchase Contract Title'), // Column EXISTS
      
      // Map buyer info to existing buyer columns
      buyer_1_name: getCustomFieldValue('Buyer Vesting'), // Map "Louise Claire Pallan" to buyer_1_name
      
      // Contract and purchase details that exist
      rep_1_purchase_contract_date: getCustomFieldValue('Rep 1 Purchase Contract Date'),
      rep_1_purchase_contract_title: getCustomFieldValue('Rep 1 Purchase Contract Title'),
      rep_1_apn: getCustomFieldValue('Rep 1 APN'),
      
      // Expected dates
      expected_closing: getCustomFieldValue('Expected Rel Closing Date'),
      exchange_agreement_drafted: getCustomFieldValue('Exchange Agreement Drafted On'),
      
      // Additional client info
      client_1_signatory_title: getCustomFieldValue('Client 1 Signatory Title'),
      
      // From main PP matter data (not custom fields)
      pp_assigned_attorney: ppData.assigned_to_users?.[0]?.display_name,
      pp_assigned_attorney_email: ppData.assigned_to_users?.[0]?.email_address,
      
      // Update timestamp
      updated_at: new Date().toISOString()
    };

    // Get current data to check which columns exist
    const { data: currentData } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    const existingColumns = Object.keys(currentData);

    // Only include fields that have values and exist in the table
    const finalUpdateData = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== null && updateData[key] !== undefined) {
        if (existingColumns.includes(key)) {
          finalUpdateData[key] = updateData[key];
        } else {
          console.log(`⚠️  Column '${key}' doesn't exist (value: ${updateData[key]})`);
        }
      }
    });

    console.log('🔄 Fields to update:', Object.keys(finalUpdateData).length - 1);
    Object.keys(finalUpdateData).forEach(key => {
      if (key !== 'updated_at') {
        console.log(`  ✅ ${key}: ${JSON.stringify(finalUpdateData[key])}`);
      }
    });

    if (Object.keys(finalUpdateData).length <= 1) {
      console.log('\\n❌ No fields to update');
      return;
    }

    // Update the database
    const { error } = await supabase
      .from('exchanges')
      .update(finalUpdateData)
      .eq('id', exchangeId);

    if (error) {
      console.log('\\n❌ Update failed:', error.message);
    } else {
      console.log('\\n✅ Successfully mapped remaining PP data!');
      
      // Show the final complete state
      console.log('\\n📋 Final verification - checking all PP-mapped fields:');
      const { data: final } = await supabase
        .from('exchanges')
        .select('rel_apn, rel_property_type, rel_contract_date, buyer_1_name, buyer_2_name, rel_purchase_contract_title, expected_closing, exchange_agreement_drafted')
        .eq('id', exchangeId)
        .single();
      
      Object.keys(final).forEach(key => {
        const status = final[key] ? '✅' : '❌';
        console.log(`  ${status} ${key}: ${final[key] || 'Still null'}`);
      });
    }

    console.log('\\n🎯 FRONTEND SHOULD NOW SHOW:');
    console.log('✅ APN: 65061-09-175');
    console.log('✅ Contract Date: 2025-05-27');
    console.log('✅ Buyer 1: Louise Claire Pallan (in buyer_1_name field)');
    console.log('✅ Purchase Contract Title: CONTRACT TO BUY AND SELL REAL ESTATE (RESIDENTIAL)');
    console.log('✅ Expected Closing Date');
    console.log('✅ Exchange Agreement Drafted Date');
    console.log('⚠️  Property Type: Still needs column (currently not available)');
    console.log('⚠️  Settlement Agent: Still needs column (currently not available)');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

finalPPMapping();