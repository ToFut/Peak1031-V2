require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// The PP data we fetched
const ppData = {
  "id": "34a90c7c-07e1-4540-b017-b50828c6b313",
  "account_ref": {
    "id": "103d05a3-9da4-4fd7-a80e-9408745747c1",
    "display_name": "Kicelian, Hector"
  },
  "number": 7869,
  "display_name": "7869 - Kicelian, Hector - (TRUST) - 860 London Green Way, Colorado Springs, CO",
  "name": "Kicelian, Hector - (TRUST) - 860 London Green Way, Colorado Springs, CO",
  "notes": null,
  "rate": "User Hourly Rate",
  "open_date": null,
  "close_date": null,
  "statute_of_limitation_date": null,
  "tags": [],
  "status": "Open",
  "assigned_to_users": [
    {
      "id": "a20f1aeb-d63f-4076-8613-3692fa56c51c",
      "display_name": "Mark Potente",
      "email_address": "mark_potente@yahoo.com"
    }
  ],
  "custom_field_values": [
    {
      "custom_field_ref": {
        "id": "c14c9e4b-3a00-48ff-9a75-bbca2c861e98",
        "label": "Rel Escrow Number",
        "value_type": "TextBox"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": null,
      "value_string": "CO-2025-30332"
    },
    {
      "custom_field_ref": {
        "id": "95d16d91-c69b-4aef-a5fb-468b066432b3",
        "label": "Rel Property Address",
        "value_type": "TextBox"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": null,
      "value_string": "860 London Green Way, Colorado Springs, CO 80906"
    },
    {
      "custom_field_ref": {
        "id": "87a37786-97a4-422d-b206-6ee914f94dcc",
        "label": "Client Vesting",
        "value_type": "TextBox"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": null,
      "value_string": "Hector Kicelian as Trustee of the Hector Kicelian Revocable Trust dated December 27, 2017"
    },
    {
      "custom_field_ref": {
        "id": "b269071e-0401-4743-8035-2912c259368f",
        "label": "Bank",
        "value_type": "DropDownList"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": null,
      "value_string": "Israel Discount Bank"
    },
    {
      "custom_field_ref": {
        "id": "aa1a4d3c-d30d-4496-ae60-adc6560cf533",
        "label": "Proceeds",
        "value_type": "Currency"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": 195816.28,
      "value_string": null
    },
    {
      "custom_field_ref": {
        "id": "33f358fe-5189-4765-b9a1-11b3fbfdca8a",
        "label": "Rel Value",
        "value_type": "Currency"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": 212000,
      "value_string": null
    },
    {
      "custom_field_ref": {
        "id": "eca273db-f212-41d5-a3ca-0b98e1a7cf74",
        "label": "Day 45",
        "value_type": "Date"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": "2025-08-11T00:00:00",
      "value_number": null,
      "value_string": null
    },
    {
      "custom_field_ref": {
        "id": "aab0acdb-ed7e-4bcd-a2ec-c66ee02d5ac7",
        "label": "Day 180",
        "value_type": "Date"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": "2025-12-24T00:00:00",
      "value_number": null,
      "value_string": null
    },
    {
      "custom_field_ref": {
        "id": "2f6e5b78-bab4-42bb-9f83-ff02bbe0f936",
        "label": "Type of Exchange",
        "value_type": "DropDownList"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": null,
      "value_string": "Delayed"
    },
    {
      "custom_field_ref": {
        "id": "cfd4cbca-67b0-4373-b67c-b8642d73f50a",
        "label": "Buyer Vesting",
        "value_type": "TextBox"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": null,
      "value_string": "Louise Claire Pallan"
    },
    {
      "custom_field_ref": {
        "id": "0427e0d4-6cdf-4547-b6e8-e18bf632d36c",
        "label": "Rep 1 Property Address",
        "value_type": "TextBox"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": null,
      "value_string": "535 Roswell Avenue, Long Beach, CA 90814"
    },
    {
      "custom_field_ref": {
        "id": "2832d45d-b424-4c19-9d0d-c38305ef195f",
        "label": "Rep 1 Value",
        "value_type": "Currency"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": 1210000,
      "value_string": null
    },
    {
      "custom_field_ref": {
        "id": "d73771e5-a87e-4fdb-84cc-0b573e83e54f",
        "label": "Referral Source",
        "value_type": "TextBox"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": null,
      "value_string": "Tom Gans"
    }
    // ... plus many more fields
  ]
};

async function manualUpdate() {
  console.log('🔧 Manually updating exchange 7869 with PP data...\n');

  try {
    // Extract key values from custom fields
    const getCustomFieldValue = (label) => {
      const field = ppData.custom_field_values.find(f => f.custom_field_ref.label === label);
      if (!field) return null;
      return field.value_string || field.value_number || field.value_date_time || 
             (field.contact_ref ? field.contact_ref.display_name : null);
    };

    const updateData = {
      // Set correct PP matter ID
      pp_matter_id: '7869',
      
      // Store complete PP data
      pp_data: ppData,
      
      // Map key fields to our schema
      client_vesting: getCustomFieldValue('Client Vesting'),
      bank: getCustomFieldValue('Bank'),
      proceeds: getCustomFieldValue('Proceeds'),
      rel_property_address: getCustomFieldValue('Rel Property Address'),
      rel_value: getCustomFieldValue('Rel Value'),
      day_45: getCustomFieldValue('Day 45'),
      day_180: getCustomFieldValue('Day 180'),
      type_of_exchange: getCustomFieldValue('Type of Exchange'),
      buyer_vesting: getCustomFieldValue('Buyer Vesting'),
      rep_1_property_address: getCustomFieldValue('Rep 1 Property Address'),
      rep_1_value: getCustomFieldValue('Rep 1 Value'),
      referral_source: getCustomFieldValue('Referral Source'),
      rel_escrow_number: getCustomFieldValue('Rel Escrow Number'),
      
      // Update metadata
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📊 Data to update:');
    Object.keys(updateData).forEach(key => {
      if (key !== 'pp_data') {
        console.log(`  ${key}: ${updateData[key]}`);
      }
    });
    console.log(`  pp_data: [Object with ${ppData.custom_field_values.length} custom fields]`);

    // Perform the update
    const { error } = await supabase
      .from('exchanges')
      .update(updateData)
      .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7');

    if (error) {
      console.log('\n❌ Update failed:', error.message);
      console.log('Error details:', error);
    } else {
      console.log('\n✅ Exchange successfully updated!');
      
      // Verify the update
      const { data: updated } = await supabase
        .from('exchanges')
        .select('pp_matter_id, pp_data, client_vesting, bank, proceeds, day_45, day_180')
        .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7')
        .single();
      
      if (updated) {
        console.log('\n📋 Verification:');
        console.log(`  pp_matter_id: ${updated.pp_matter_id}`);
        console.log(`  has pp_data: ${updated.pp_data ? 'Yes' : 'No'}`);
        console.log(`  client_vesting: ${updated.client_vesting}`);
        console.log(`  bank: ${updated.bank}`);
        console.log(`  proceeds: ${updated.proceeds}`);
        console.log(`  day_45: ${updated.day_45}`);
        console.log(`  day_180: ${updated.day_180}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

manualUpdate();