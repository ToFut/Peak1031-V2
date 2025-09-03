require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getDisplayData() {
  console.log('📋 Getting display data for exchange 7869...\n');

  try {
    const { data: exchange } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7')
      .single();

    if (!exchange) {
      console.log('❌ Exchange not found');
      return;
    }

    console.log('🏷️  BASIC INFO:');
    console.log(`Name: ${exchange.name}`);
    console.log(`Exchange ID: ${exchange.id}`);
    console.log(`PP Matter ID: ${exchange.pp_matter_id}`);
    console.log(`Status: ${exchange.status}`);

    console.log('\n💰 FINANCIAL DATA:');
    console.log(`Proceeds: $${exchange.proceeds || 'Not specified'}`);
    console.log(`Relinquished Value: $${exchange.rel_value || 'Not specified'}`);
    console.log(`Exchange Value: $${exchange.exchange_value || 'Not specified'}`);

    console.log('\n📅 KEY DATES:');
    console.log(`Day 45: ${exchange.identification_deadline || exchange.day_45 || 'Not specified'}`);
    console.log(`Day 180: ${exchange.exchange_deadline || exchange.day_180 || 'Not specified'}`);
    console.log(`Start Date: ${exchange.start_date || 'Not specified'}`);

    console.log('\n🏠 PROPERTY INFO:');
    console.log(`Relinquished Address: ${exchange.relinquished_property_address || exchange.rel_property_address || 'Not specified'}`);
    console.log(`Property Type: ${exchange.property_type || 'Not specified'}`);

    console.log('\n👥 PEOPLE:');
    console.log(`Client Vesting: ${exchange.client_vesting || 'Not specified'}`);
    console.log(`Bank: ${exchange.bank || 'Not specified'}`);
    console.log(`Exchange Type: ${exchange.type_of_exchange || exchange.exchange_type || 'Not specified'}`);

    if (exchange.pp_data && Object.keys(exchange.pp_data).length > 0) {
      console.log('\n📦 PP DATA AVAILABLE:');
      console.log(`Custom fields stored: ${exchange.pp_data.custom_field_values?.length || 0}`);
      
      if (exchange.pp_data.custom_field_values) {
        console.log('\n📋 Available Custom Fields:');
        exchange.pp_data.custom_field_values.forEach(field => {
          const value = field.value_string || field.value_number || field.value_date_time || 
                       (field.contact_ref ? field.contact_ref.display_name : null);
          if (value) {
            console.log(`  • ${field.custom_field_ref.label}: ${value}`);
          }
        });
      }
    } else {
      console.log('\n❌ No PP data stored');
    }

    console.log('\n🔗 Access this exchange at:');
    console.log(`http://localhost:3000/exchanges/${exchange.id}`);

    console.log('\n✨ What you should see on the page:');
    console.log('• All the custom field data from PracticePanther');
    console.log('• Client Vesting, Bank, Proceeds, Day 45/180 dates');
    console.log('• Property details and replacement property info');
    console.log('• Instead of "Not specified" for most fields');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

getDisplayData();