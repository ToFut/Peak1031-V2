require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Sample contact data from your JSON
const sampleContact = {
  "id": "cf917da7-2c86-43c0-809c-4a9d5e6b5936",
  "account_ref": {
    "id": "d39e4f5e-9e95-430d-93e2-3840213960ca",
    "display_name": "Jaber, Lisa"
  },
  "is_primary_contact": true,
  "display_name": "Jaber, Lisa",
  "first_name": "Lisa",
  "middle_name": null,
  "last_name": "Jaber",
  "phone_mobile": null,
  "phone_home": "(330)436-6141",
  "phone_fax": null,
  "phone_work": null,
  "email": "ljaber@OldRepublicTitle.com",
  "notes": "",
  "custom_field_values": [
    {
      "custom_field_ref": {
        "id": "bdb8869c-bd4e-4af9-bdcf-deeff830f0b2",
        "label": "2nd Signatory Email",
        "value_type": "TextBox"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": null,
      "value_string": null
    },
    {
      "custom_field_ref": {
        "id": "6d14372f-58ab-4347-a696-ff7e4c824875",
        "label": "Escrow Company Name",
        "value_type": "TextBox"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": null,
      "value_string": "Old Republic Title Company "
    },
    {
      "custom_field_ref": {
        "id": "9f1c4391-b23b-4575-b431-57b6e28f07bd",
        "label": "Fee",
        "value_type": "Currency"
      },
      "value_boolean": false,
      "contact_ref": null,
      "value_date_time": null,
      "value_number": null,
      "value_string": null
    }
  ]
};

async function testContactInsert() {
  try {
    console.log('🧪 TESTING CONTACT DATA INSERT\n');
    
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    // Transform the data to match our database schema
    const contactData = {
      id: sampleContact.id,
      pp_contact_id: sampleContact.account_ref.id,
      first_name: sampleContact.first_name,
      last_name: sampleContact.last_name,
      email: sampleContact.email,
      phone: sampleContact.phone_home || sampleContact.phone_mobile || sampleContact.phone_work,
      company: sampleContact.account_ref.display_name,
      pp_data: sampleContact, // Store the full original data
      is_primary: sampleContact.is_primary_contact,
      notes: sampleContact.notes,
      contact_type: 'Escrow Officer', // Based on the data
      source: 'PracticePanther',
      is_user: false,
      is_active: true,
      email_verified: false,
      role: 'third_party'
    };
    
    console.log('📋 TRANSFORMED DATA:');
    console.log(JSON.stringify(contactData, null, 2));
    
    // Try to insert into people table (since contacts doesn't exist)
    console.log('\n🔄 INSERTING INTO PEOPLE TABLE...');
    const { data: insertResult, error: insertError } = await supabase
      .from('people')
      .insert([contactData])
      .select();
    
    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      
      // Check if it's a duplicate key error
      if (insertError.message.includes('duplicate key')) {
        console.log('\n🔄 Trying to update existing record...');
        const { data: updateResult, error: updateError } = await supabase
          .from('people')
          .update(contactData)
          .eq('id', sampleContact.id)
          .select();
        
        if (updateError) {
          console.log('❌ Update error:', updateError.message);
        } else {
          console.log('✅ Record updated successfully');
          console.log('Updated record:', JSON.stringify(updateResult[0], null, 2));
        }
      }
    } else {
      console.log('✅ Record inserted successfully');
      console.log('Inserted record:', JSON.stringify(insertResult[0], null, 2));
    }
    
    // Test querying the data
    console.log('\n🔍 TESTING DATA RETRIEVAL...');
    const { data: retrievedData, error: retrieveError } = await supabase
      .from('people')
      .select('*')
      .eq('id', sampleContact.id)
      .single();
    
    if (retrieveError) {
      console.log('❌ Retrieve error:', retrieveError.message);
    } else {
      console.log('✅ Data retrieved successfully');
      console.log('Retrieved data:', JSON.stringify(retrievedData, null, 2));
      
      // Test accessing custom fields from pp_data
      console.log('\n🔍 TESTING CUSTOM FIELDS ACCESS:');
      if (retrievedData.pp_data && retrievedData.pp_data.custom_field_values) {
        console.log('Custom fields found:');
        retrievedData.pp_data.custom_field_values.forEach(field => {
          console.log(`  - ${field.custom_field_ref.label}: ${field.value_string || 'null'}`);
        });
      }
    }
    
    // Test creating a contacts table if it doesn't exist
    console.log('\n🔧 TESTING CONTACTS TABLE CREATION...');
    try {
      const { data: createTableResult, error: createTableError } = await supabase
        .rpc('create_contacts_table');
      
      if (createTableError) {
        console.log('❌ Create table error:', createTableError.message);
      } else {
        console.log('✅ Contacts table created successfully');
      }
    } catch (error) {
      console.log('❌ Table creation not supported via RPC');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testContactInsert(); 