require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function mapAllMissingFields() {
  console.log('🔄 Mapping ALL missing PracticePanther fields...\\n');
  
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7';
  
  try {
    // Get the exchange with PP data
    const { data: exchange } = await supabase
      .from('exchanges')
      .select('id, pp_data')
      .eq('id', exchangeId)
      .single();

    if (!exchange || !exchange.pp_data) {
      console.log('❌ Exchange or PP data not found');
      return;
    }

    const ppData = exchange.pp_data;
    const customFields = ppData.custom_field_values || [];

    // Helper function to get custom field value
    const getCustomFieldValue = (label) => {
      const field = customFields.find(f => f.custom_field_ref.label === label);
      if (!field) return null;
      return field.value_string || field.value_number || field.value_date_time || 
             (field.contact_ref ? field.contact_ref.display_name : field.value_boolean);
    };

    console.log('📋 ALL PP Custom Fields Available:');
    customFields.forEach((field, index) => {
      const value = field.value_string || field.value_number || field.value_date_time || 
                   (field.contact_ref ? field.contact_ref.display_name : field.value_boolean);
      console.log(`${index + 1}. "${field.custom_field_ref.label}" (${field.custom_field_ref.value_type}): ${JSON.stringify(value)}`);
    });

    // Extended comprehensive mapping with all available fields
    const updateData = {
      // Missing key fields we have data for
      rel_apn: getCustomFieldValue('Rel APN'), // "65061-09-175"
      rel_property_type: getCustomFieldValue('Property Type'), // "Residential"
      rel_contract_date: getCustomFieldValue('Rel Contract Date'), // "2025-05-27T00:00:00"
      
      // Expected dates and additional contract info
      expected_closing: getCustomFieldValue('Expected Rel Closing Date'), // "2025-06-27T00:00:00"
      exchange_agreement_drafted: getCustomFieldValue('Exchange Agreement Drafted On'), // "2025-06-04T00:00:00"
      rel_purchase_contract_title: getCustomFieldValue('Rel Purchase Contract Title'), // Contract details
      
      // Buyer information that's missing
      buyer_vesting: getCustomFieldValue('Buyer Vesting'), // "Louise Claire Pallan"
      
      // Referral information that should show
      referral_source: getCustomFieldValue('Referral Source'), // "Tom Gans"
      referral_source_email: getCustomFieldValue('Referral Source Email'), // "Tom@rtiproperties.com"
      bank_referral: getCustomFieldValue('Bank Referral?'), // false
      
      // Client signatory information
      client_1_signatory_title: getCustomFieldValue('Client 1 Signatory Title'), // "Trustee"
      client_2_name: getCustomFieldValue('Client 2 Name'),
      client_2_signatory_title: getCustomFieldValue('Client 2 Signatory Title'),
      
      // Settlement and assigned user info from main PP data
      settlement_agent: ppData.settlement_agent,
      assigned_attorney: ppData.assigned_to_users?.[0]?.display_name, // "Mark Potente"
      assigned_attorney_email: ppData.assigned_to_users?.[0]?.email_address, // "mark_potente@yahoo.com"
      
      // Update timestamp
      updated_at: new Date().toISOString()
    };

    // Get current table structure to see what columns exist
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
          console.log(`⚠️  Column '${key}' doesn't exist in table (value: ${updateData[key]})`);
        }
      }
    });

    console.log('\\n🔄 New fields to add:', Object.keys(finalUpdateData).length - 1); // -1 for updated_at
    Object.keys(finalUpdateData).forEach(key => {
      if (key !== 'updated_at') {
        console.log(`  ✅ ${key}: ${JSON.stringify(finalUpdateData[key])}`);
      }
    });

    if (Object.keys(finalUpdateData).length <= 1) { // Only updated_at or empty
      console.log('\\n❌ No new fields to update');
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
      console.log('\\n✅ Successfully updated exchange with missing PP data!');
      console.log(`Updated ${Object.keys(finalUpdateData).length - 1} additional fields`);
      
      // Verify the update
      const { data: updated } = await supabase
        .from('exchanges')
        .select(Object.keys(finalUpdateData).join(','))
        .eq('id', exchangeId)
        .single();
      
      if (updated) {
        console.log('\\n📋 Verification - Newly added fields:');
        Object.keys(finalUpdateData).forEach(key => {
          if (key !== 'updated_at') {
            console.log(`  ✅ ${key}: ${updated[key]}`);
          }
        });
      }
    }

    console.log('\\n🎯 FRONTEND SHOULD NOW DISPLAY:');
    console.log('• APN: 65061-09-175 (instead of "Not specified")');
    console.log('• Property Type: Residential (instead of "Not specified")');
    console.log('• Contract Date: May 27, 2025 (instead of "Not specified")');
    console.log('• Buyer Vesting: Louise Claire Pallan (instead of "Not specified")');
    console.log('• Settlement Agent: (if available)');
    console.log('• Referral Source: Tom Gans');
    console.log('• Referral Email: Tom@rtiproperties.com');
    console.log('• Expected Closing: June 27, 2025');
    console.log('• Exchange Agreement Drafted: June 4, 2025');
    console.log('• All other detailed PP information');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

mapAllMissingFields();