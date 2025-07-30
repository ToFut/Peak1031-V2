const { createClient } = require('./backend/node_modules/@supabase/supabase-js');
require('dotenv').config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // Check if contacts table has new columns
    console.log('👥 CONTACTS TABLE SCHEMA:');
    const { data: contactsSchema, error: contactsError } = await supabase
      .from('contacts')
      .select('*')
      .limit(1);
    
    if (contactsError && contactsError.message.includes('column')) {
      console.log('❌ Missing columns in contacts table');
      console.log('Error:', contactsError.message);
    } else {
      console.log('✅ Contacts table accessible');
    }

    // Try to insert a test contact to see what columns exist
    const testContact = {
      pp_contact_id: 'TEST_001',
      first_name: 'Test',
      last_name: 'Contact',
      email: 'test@example.com',
      position: 'Test Position',
      contact_type: 'Client',
      notes: 'Test notes'
    };

    const { data: testContactResult, error: testContactError } = await supabase
      .from('contacts')
      .insert(testContact)
      .select()
      .single();

    if (testContactError) {
      console.log('❌ Contact insert error:', testContactError.message);
    } else {
      console.log('✅ Contact with new fields inserted successfully');
      
      // Clean up test data
      await supabase.from('contacts').delete().eq('id', testContactResult.id);
    }
    console.log('---\n');

    // Check exchanges table
    console.log('🏢 EXCHANGES TABLE SCHEMA:');
    const testExchange = {
      pp_matter_id: 'TEST_MATTER_001',
      name: 'Test Exchange',
      exchange_name: 'Test Exchange Name',
      exchange_type: 'Delayed',
      new_status: 'Draft',
      relinquished_property_address: '123 Test St',
      relinquished_sale_price: 500000.00,
      exchange_coordinator: 'Test Coordinator'
    };

    const { data: testExchangeResult, error: testExchangeError } = await supabase
      .from('exchanges')
      .insert(testExchange)
      .select()
      .single();

    if (testExchangeError) {
      console.log('❌ Exchange insert error:', testExchangeError.message);
    } else {
      console.log('✅ Exchange with new fields inserted successfully');
      
      // Clean up test data
      await supabase.from('exchanges').delete().eq('id', testExchangeResult.id);
    }
    console.log('---\n');

    // Check if replacement_properties table exists
    console.log('🏠 REPLACEMENT_PROPERTIES TABLE:');
    const { data: propsTest, error: propsError } = await supabase
      .from('replacement_properties')
      .select('*')
      .limit(1);

    if (propsError) {
      console.log('❌ Replacement properties table error:', propsError.message);
    } else {
      console.log('✅ Replacement properties table exists');
    }
    console.log('---\n');

    // Check if contact_exchange_links table exists
    console.log('🔗 CONTACT_EXCHANGE_LINKS TABLE:');
    const { data: linksTest, error: linksError } = await supabase
      .from('contact_exchange_links')
      .select('*')
      .limit(1);

    if (linksError) {
      console.log('❌ Contact exchange links table error:', linksError.message);
    } else {
      console.log('✅ Contact exchange links table exists');
    }

  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkSchema();