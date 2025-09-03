require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// The PP data we fetched
const ppData = {
  "id": "34a90c7c-07e1-4540-b017-b50828c6b313",
  "number": 7869,
  "display_name": "7869 - Kicelian, Hector - (TRUST) - 860 London Green Way, Colorado Springs, CO",
  "name": "Kicelian, Hector - (TRUST) - 860 London Green Way, Colorado Springs, CO",
  "status": "Open",
  "custom_field_values": [
    {
      "custom_field_ref": {
        "label": "Rel Escrow Number"
      },
      "value_string": "CO-2025-30332"
    },
    {
      "custom_field_ref": {
        "label": "Rel Property Address"
      },
      "value_string": "860 London Green Way, Colorado Springs, CO 80906"
    },
    {
      "custom_field_ref": {
        "label": "Client Vesting"
      },
      "value_string": "Hector Kicelian as Trustee of the Hector Kicelian Revocable Trust dated December 27, 2017"
    },
    {
      "custom_field_ref": {
        "label": "Bank"
      },
      "value_string": "Israel Discount Bank"
    },
    {
      "custom_field_ref": {
        "label": "Proceeds"
      },
      "value_number": 195816.28
    },
    {
      "custom_field_ref": {
        "label": "Rel Value"
      },
      "value_number": 212000
    },
    {
      "custom_field_ref": {
        "label": "Day 45"
      },
      "value_date_time": "2025-08-11T00:00:00"
    },
    {
      "custom_field_ref": {
        "label": "Day 180"
      },
      "value_date_time": "2025-12-24T00:00:00"
    },
    {
      "custom_field_ref": {
        "label": "Type of Exchange"
      },
      "value_string": "Delayed"
    },
    {
      "custom_field_ref": {
        "label": "Buyer Vesting"
      },
      "value_string": "Louise Claire Pallan"
    },
    {
      "custom_field_ref": {
        "label": "Rep 1 Property Address"
      },
      "value_string": "535 Roswell Avenue, Long Beach, CA 90814"
    },
    {
      "custom_field_ref": {
        "label": "Rep 1 Value"
      },
      "value_number": 1210000
    },
    {
      "custom_field_ref": {
        "label": "Referral Source"
      },
      "value_string": "Tom Gans"
    }
  ]
};

async function checkSchemaAndUpdate() {
  console.log('🔍 Checking schema and updating exchange 7869...\n');

  try {
    // First get current exchange to see what fields exist
    const { data: currentExchange } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7')
      .single();

    if (!currentExchange) {
      console.log('❌ Exchange not found');
      return;
    }

    console.log('📊 Current exchange fields:');
    console.log(Object.keys(currentExchange).join(', '));

    // Extract values from PP custom fields
    const getCustomFieldValue = (label) => {
      const field = ppData.custom_field_values.find(f => f.custom_field_ref.label === label);
      if (!field) return null;
      return field.value_string || field.value_number || field.value_date_time;
    };

    // Build update with only fields that exist in schema
    const updateData = {
      // Always safe to update these
      pp_matter_id: '7869',
      pp_data: ppData,
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Check if these fields exist and add them if they do
    const possibleFields = {
      'relinquished_property_address': getCustomFieldValue('Rel Property Address'),
      'relinquished_sale_price': getCustomFieldValue('Rel Value'),
      'proceeds': getCustomFieldValue('Proceeds'),
      'bank_account_escrow': getCustomFieldValue('Bank'),
      'identification_deadline': getCustomFieldValue('Day 45'),
      'exchange_deadline': getCustomFieldValue('Day 180'),
      'exchange_type': getCustomFieldValue('Type of Exchange')?.toLowerCase(),
      'exchange_coordinator': 'Mark Potente' // From assigned users
    };

    // Only add fields that exist in current exchange
    Object.keys(possibleFields).forEach(field => {
      if (currentExchange.hasOwnProperty(field) && possibleFields[field] !== null) {
        updateData[field] = possibleFields[field];
      }
    });

    console.log('\n🔧 Fields to update:');
    Object.keys(updateData).forEach(key => {
      if (key !== 'pp_data') {
        console.log(`  ${key}: ${updateData[key]}`);
      } else {
        console.log(`  ${key}: [PP data with ${ppData.custom_field_values.length} custom fields]`);
      }
    });

    // Perform the update
    const { error } = await supabase
      .from('exchanges')
      .update(updateData)
      .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7');

    if (error) {
      console.log('\n❌ Update failed:', error.message);
    } else {
      console.log('\n✅ Exchange successfully updated!');
      
      // Verify the update
      const { data: updated } = await supabase
        .from('exchanges')
        .select('pp_matter_id, pp_data, relinquished_property_address, proceeds, identification_deadline, exchange_deadline')
        .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7')
        .single();
      
      if (updated) {
        console.log('\n📋 Verification:');
        console.log(`  pp_matter_id: ${updated.pp_matter_id}`);
        console.log(`  has pp_data: ${updated.pp_data && Object.keys(updated.pp_data).length > 0 ? 'Yes' : 'No'}`);
        console.log(`  relinquished_property_address: ${updated.relinquished_property_address}`);
        console.log(`  proceeds: ${updated.proceeds}`);
        console.log(`  identification_deadline: ${updated.identification_deadline}`);
        console.log(`  exchange_deadline: ${updated.exchange_deadline}`);
        
        if (updated.pp_data && updated.pp_data.custom_field_values) {
          console.log(`\n🎉 SUCCESS! All PracticePanther data is now stored!`);
          console.log('The exchange detail page should now show all the missing information.');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSchemaAndUpdate();