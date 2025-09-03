require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function mapAllPPFields() {
  console.log('🔄 Mapping ALL PracticePanther fields to database columns...\\n');
  
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
             (field.contact_ref ? field.contact_ref.display_name : null);
    };

    // First, let's see what fields we have available
    console.log('📋 Available PP Custom Fields:');
    customFields.forEach((field, index) => {
      const value = field.value_string || field.value_number || field.value_date_time || 
                   (field.contact_ref ? field.contact_ref.display_name : null);
      console.log(`${index + 1}. "${field.custom_field_ref.label}": ${JSON.stringify(value)}`);
    });

    // Get current table structure to see what columns exist
    console.log('\\n🔍 Checking existing table columns...');
    const { data: currentData, error: currentError } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();
      
    if (currentError) {
      console.log('❌ Error checking current data:', currentError.message);
      return;
    }

    const existingColumns = Object.keys(currentData);
    console.log('Available columns:', existingColumns.length);

    // Complete field mapping based on what we see is missing on frontend
    const updateData = {
      // Basic info from PP data directly
      pp_display_name: ppData.display_name,
      pp_matter_number: ppData.number,
      pp_matter_status: ppData.status,
      pp_responsible_attorney: ppData.assigned_to_users?.[0]?.display_name,
      
      // Financial data
      client_vesting: getCustomFieldValue('Client Vesting'),
      bank: getCustomFieldValue('Bank'),
      proceeds: getCustomFieldValue('Proceeds'),
      
      // Key dates
      day_45: getCustomFieldValue('Day 45'),
      day_180: getCustomFieldValue('Day 180'),
      
      // Relinquished property
      rel_property_address: getCustomFieldValue('Rel Property Address'),
      rel_escrow_number: getCustomFieldValue('Rel Escrow Number'),
      rel_value: getCustomFieldValue('Rel Value'),
      rel_apn: getCustomFieldValue('Rel APN'),
      rel_property_type: getCustomFieldValue('Property Type'),
      rel_contract_date: getCustomFieldValue('Rel Contract Date'),
      
      // Exchange details
      type_of_exchange: getCustomFieldValue('Type of Exchange'),
      
      // Replacement property
      rep_1_property_address: getCustomFieldValue('Rep 1 Property Address'),
      rep_1_value: getCustomFieldValue('Rep 1 Value'),
      rep_1_seller_1_name: getCustomFieldValue('Rep 1 Seller 1 Name'),
      rep_1_seller_2_name: getCustomFieldValue('Rep 1 Seller 2 Name'),
      rep_1_apn: getCustomFieldValue('Rep 1 APN'),
      rep_1_escrow_number: getCustomFieldValue('Rep 1 Escrow Number'),
      rep_1_contract_date: getCustomFieldValue('Rep 1 Purchase Contract Date'),
      
      // Buyer information
      buyer_vesting: getCustomFieldValue('Buyer Vesting'),
      buyer_1_name: getCustomFieldValue('Buyer 1 Name'),
      buyer_2_name: getCustomFieldValue('Buyer 2 Name'),
      
      // Contact/referral info
      referral_source: getCustomFieldValue('Referral Source'),
      referral_source_email: getCustomFieldValue('Referral Source Email'),
      
      // Additional fields we might be missing - check PP data structure
      settlement_agent: ppData.settlement_agent || getCustomFieldValue('Settlement Agent'),
      assigned_attorney: ppData.assigned_to_users?.[0]?.display_name,
      assigned_attorney_email: ppData.assigned_to_users?.[0]?.email_address,
      
      // Update timestamp
      updated_at: new Date().toISOString()
    };

    // Only include fields that have values and exist in the table
    const finalUpdateData = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== null && updateData[key] !== undefined && existingColumns.includes(key)) {
        finalUpdateData[key] = updateData[key];
      }
    });

    console.log('\\n🔄 Fields to update:', Object.keys(finalUpdateData).length);
    Object.keys(finalUpdateData).forEach(key => {
      if (key !== 'updated_at') {
        console.log(`  ✅ ${key}: ${JSON.stringify(finalUpdateData[key])}`);
      }
    });

    if (Object.keys(finalUpdateData).length === 1) { // Only updated_at
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
      console.log('Error details:', error);
    } else {
      console.log('\\n✅ Successfully updated exchange with all PP data!');
      console.log(`Updated ${Object.keys(finalUpdateData).length - 1} fields`);
      
      // Verify the update
      const { data: updated } = await supabase
        .from('exchanges')
        .select(Object.keys(finalUpdateData).join(','))
        .eq('id', exchangeId)
        .single();
      
      if (updated) {
        console.log('\\n📋 Verification - Updated fields:');
        Object.keys(finalUpdateData).forEach(key => {
          if (key !== 'updated_at') {
            console.log(`  ✅ ${key}: ${updated[key]}`);
          }
        });
      }
    }

    console.log('\\n🎯 FRONTEND SHOULD NOW SHOW:');
    console.log('• APN: 65061-09-175');
    console.log('• Property Type: Residential'); 
    console.log('• Settlement Agent: (if data available)');
    console.log('• Contract Dates: (if data available)');
    console.log('• Buyer Names: Louise Claire Pallan');
    console.log('• Rep Property APN and details');
    console.log('• Assigned Attorney: Mark Potente');
    console.log('• All other missing PP fields');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

mapAllPPFields();