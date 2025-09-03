require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function mapPPFieldsToTable() {
  console.log('🔄 Mapping PracticePanther fields to table columns...\n');

  try {
    // Get the exchange with pp_data
    const { data: exchange } = await supabase
      .from('exchanges')
      .select('id, pp_data')
      .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7')
      .single();

    if (!exchange || !exchange.pp_data) {
      console.log('❌ Exchange or PP data not found');
      return;
    }

    const ppData = exchange.pp_data;
    const customFields = ppData.custom_field_values || [];

    console.log('📋 Available PP Custom Fields:');
    customFields.forEach((field, index) => {
      const value = field.value_string || field.value_number || field.value_date_time || 
                   (field.contact_ref ? field.contact_ref.display_name : null);
      console.log(`${index + 1}. ${field.custom_field_ref.label}: ${value}`);
    });

    // Helper function to get custom field value
    const getCustomFieldValue = (label) => {
      const field = customFields.find(f => f.custom_field_ref.label === label);
      if (!field) return null;
      return field.value_string || field.value_number || field.value_date_time || 
             (field.contact_ref ? field.contact_ref.display_name : null);
    };

    // Map PP fields to table columns (exactly what the frontend expects)
    const mappedData = {
      // Client & Banking
      client_vesting: getCustomFieldValue('Client Vesting'),
      bank: getCustomFieldValue('Bank'),
      proceeds: getCustomFieldValue('Proceeds'),
      
      // Dates (what frontend ExchangeOverview expects)
      day_45: getCustomFieldValue('Day 45'),
      day_180: getCustomFieldValue('Day 180'),
      
      // Property Info
      rel_property_address: getCustomFieldValue('Rel Property Address'),
      rel_escrow_number: getCustomFieldValue('Rel Escrow Number'),
      rel_value: getCustomFieldValue('Rel Value'),
      rel_apn: getCustomFieldValue('Rel APN'),
      
      // Exchange Info
      type_of_exchange: getCustomFieldValue('Type of Exchange'),
      
      // Buyer Info
      buyer_vesting: getCustomFieldValue('Buyer Vesting'),
      buyer_1_name: getCustomFieldValue('Buyer 1 Name'),
      
      // Replacement Property
      rep_1_property_address: getCustomFieldValue('Rep 1 Property Address'),
      rep_1_value: getCustomFieldValue('Rep 1 Value'),
      rep_1_seller_1_name: getCustomFieldValue('Rep 1 Seller 1 Name'),
      rep_1_seller_2_name: getCustomFieldValue('Rep 1 Seller 2 Name'),
      rep_1_apn: getCustomFieldValue('Rep 1 APN'),
      rep_1_escrow_number: getCustomFieldValue('Rep 1 Escrow Number'),
      rep_1_purchase_contract_date: getCustomFieldValue('Rep 1 Purchase Contract Date'),
      
      // Contact Info
      referral_source: getCustomFieldValue('Referral Source'),
      referral_source_email: getCustomFieldValue('Referral Source Email'),
      
      // Update timestamp
      updated_at: new Date().toISOString()
    };

    // Remove null values
    Object.keys(mappedData).forEach(key => {
      if (mappedData[key] === null) {
        delete mappedData[key];
      }
    });

    console.log('\n🔄 Mapping to table columns:');
    Object.keys(mappedData).forEach(key => {
      if (key !== 'updated_at') {
        console.log(`  ${key}: ${mappedData[key]}`);
      }
    });

    // Update the database
    const { error } = await supabase
      .from('exchanges')
      .update(mappedData)
      .eq('id', exchange.id);

    if (error) {
      console.log('\n❌ Update failed:', error.message);
      console.log('Available columns might not match. Error details:', error);
    } else {
      console.log('\n✅ Successfully mapped PP fields to table columns!');
      
      // Verify the update
      const { data: updated } = await supabase
        .from('exchanges')
        .select('client_vesting, bank, day_45, day_180, rel_property_address, rep_1_property_address, buyer_vesting, type_of_exchange')
        .eq('id', exchange.id)
        .single();
      
      if (updated) {
        console.log('\n📋 Verification - Fields now populated:');
        Object.keys(updated).forEach(key => {
          if (updated[key]) {
            console.log(`  ✅ ${key}: ${updated[key]}`);
          } else {
            console.log(`  ❌ ${key}: Not set`);
          }
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

mapPPFieldsToTable();