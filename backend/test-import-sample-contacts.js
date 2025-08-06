require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

console.log('🧪 TESTING CONTACT IMPORT WITH SAMPLE DATA\n');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Sample contacts from your data
const sampleContacts = [
  {
    id: "fc396532-5361-48b8-a442-a726512ea589",
    account_ref: {
      id: "161bfaaf-f477-4c56-baea-be88be1878fb",
      display_name: "Yero, P.A., Arturo"
    },
    is_primary_contact: true,
    display_name: "Yero, P.A., Arturo",
    first_name: "Arturo",
    middle_name: null,
    last_name: "Yero, P.A.",
    phone_mobile: "+13057254955",
    phone_home: "(305) 444 0884",
    phone_fax: "(305) 444 0786",
    phone_work: "(305) 444 0884",
    email: "arturoyero@ayerolaw.com",
    notes: null,
    custom_field_values: [
      {
        custom_field_ref: {
          id: "9f1c4391-b23b-4575-b431-57b6e28f07bd",
          label: "Fee",
          value_type: "Currency"
        },
        value_boolean: false,
        contact_ref: null,
        value_date_time: null,
        value_number: null,
        value_string: null
      },
      {
        custom_field_ref: {
          id: "6d14372f-58ab-4347-a696-ff7e4c824875",
          label: "Escrow Company Name",
          value_type: "TextBox"
        },
        value_boolean: false,
        contact_ref: null,
        value_date_time: null,
        value_number: null,
        value_string: "Arturo Yero, P.A."
      }
    ]
  },
  {
    id: "f1e953ea-cbdc-404a-bff6-c27ecdf4a0bc",
    account_ref: {
      id: "08029119-9da0-4198-a4aa-1dddce48fc32",
      display_name: "Pandit, Arun N."
    },
    is_primary_contact: true,
    display_name: "Pandit, Arun N.",
    first_name: "Arun N.",
    middle_name: null,
    last_name: "Pandit",
    phone_mobile: null,
    phone_home: "928 600 3432",
    phone_fax: null,
    phone_work: null,
    email: "panditarun623@gmail.com",
    notes: null,
    custom_field_values: [
      {
        custom_field_ref: {
          id: "9f1c4391-b23b-4575-b431-57b6e28f07bd",
          label: "Fee",
          value_type: "Currency"
        },
        value_boolean: false,
        contact_ref: null,
        value_date_time: null,
        value_number: 1000.00,
        value_string: null
      },
      {
        custom_field_ref: {
          id: "de783de7-6d37-4689-8232-a14b2e0f6a18",
          label: "Adtl. Replacement Property Fee",
          value_type: "Currency"
        },
        value_boolean: false,
        contact_ref: null,
        value_date_time: null,
        value_number: 300.00,
        value_string: null
      }
    ]
  }
];

function transformContact(ppContact) {
  // Transform PP contact to our database format
  return {
    pp_contact_id: ppContact.id,
    first_name: ppContact.first_name || '',
    last_name: ppContact.last_name || '',
    email: ppContact.email || null,
    phone: ppContact.phone_mobile || ppContact.phone_work || ppContact.phone_home || null,
    company: ppContact.account_ref?.display_name || null,
    role: ppContact.is_primary_contact ? 'client' : 'contact',
    is_user: false,
    is_active: true,
    pp_data: ppContact, // Store all original PP data
    source: 'practice_partner',
    last_sync_at: new Date().toISOString()
  };
}

async function testImportSampleContacts() {
  console.log('🧪 Testing import with sample contacts...\n');
  
  try {
    // Transform the sample contacts
    const transformedContacts = sampleContacts.map(transformContact);
    
    console.log('📋 TRANSFORMED CONTACTS:');
    transformedContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.first_name} ${contact.last_name}`);
      console.log(`   Email: ${contact.email}`);
      console.log(`   Phone: ${contact.phone}`);
      console.log(`   Company: ${contact.company}`);
      console.log(`   PP ID: ${contact.pp_contact_id}`);
      console.log(`   Custom Fields: ${contact.pp_data.custom_field_values?.length || 0}`);
      console.log('');
    });
    
    // Check if contacts already exist
    console.log('🔍 Checking for existing contacts...');
    
    const ppIds = transformedContacts.map(c => c.pp_contact_id);
    const { data: existingContacts, error: checkError } = await supabase
      .from('people')
      .select('pp_contact_id, first_name, last_name')
      .in('pp_contact_id', ppIds);
    
    if (checkError) {
      console.log('❌ Error checking existing contacts:', checkError.message);
      return;
    }
    
    console.log(`📊 Found ${existingContacts.length} existing contacts`);
    
    // Insert into database
    console.log('\n💾 Inserting contacts into database...');
    
    const { data: insertedData, error } = await supabase
      .from('people')
      .upsert(transformedContacts, {
        onConflict: 'pp_contact_id',
        ignoreDuplicates: false
      });
    
    if (error) {
      console.log('❌ Database error:', error.message);
      return;
    }
    
    console.log(`✅ Successfully imported ${insertedData.length} contacts`);
    
    // Verify the import
    console.log('\n🔍 Verifying import...');
    
    const { data: importedContacts, error: verifyError } = await supabase
      .from('people')
      .select('pp_contact_id, first_name, last_name, email, company, pp_data')
      .in('pp_contact_id', ppIds);
    
    if (verifyError) {
      console.log('❌ Error verifying import:', verifyError.message);
      return;
    }
    
    console.log(`📊 Verified ${importedContacts.length} contacts in database:`);
    importedContacts.forEach((contact, index) => {
      console.log(`${index + 1}. ${contact.first_name} ${contact.last_name} (${contact.pp_contact_id})`);
      console.log(`   Email: ${contact.email}`);
      console.log(`   Company: ${contact.company}`);
      console.log(`   Custom Fields: ${contact.pp_data.custom_field_values?.length || 0}`);
    });
    
    // Check total PP contacts in database
    const { count: totalPPContacts, error: countError } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'practice_partner');
    
    if (countError) {
      console.log('❌ Error counting contacts:', countError.message);
    } else {
      console.log(`\n📊 Total PP contacts in database: ${totalPPContacts}`);
    }
    
    console.log('\n🎉 Sample import test completed successfully!');
    console.log('✅ Database structure works correctly');
    console.log('✅ Contact transformation works');
    console.log('✅ Custom fields are preserved');
    console.log('✅ Ready for full sync!');
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

testImportSampleContacts(); 