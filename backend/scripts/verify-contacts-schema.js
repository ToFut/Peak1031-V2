#!/usr/bin/env node

/**
 * Verify that client_ids in exchanges correctly reference the contacts table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyContactsSchema() {
  console.log('🔍 Verifying contacts schema and relationships...\n');

  try {
    // Get a sample exchange with client_id
    const { data: sampleExchange } = await supabase
      .from('exchanges')
      .select('id, name, client_id')
      .not('client_id', 'is', null)
      .limit(1)
      .single();

    if (!sampleExchange) {
      console.log('❌ No exchanges with client_id found');
      return;
    }

    console.log(`📝 Sample exchange: ${sampleExchange.name}`);
    console.log(`Client ID: ${sampleExchange.client_id}`);

    // Check if this client_id exists in contacts table
    const { data: contact, error: contactError } = await supabase
      .from('contacts')
      .select('id, email, first_name, last_name, company')
      .eq('id', sampleExchange.client_id)
      .single();

    if (contactError) {
      console.log('❌ Error querying contacts table:', contactError.message);
      
      // Check if it exists in people table instead
      const { data: person } = await supabase
        .from('people')
        .select('id, email, first_name, last_name, company, is_user')
        .eq('id', sampleExchange.client_id)
        .single();

      if (person) {
        console.log(`⚠️  Client ID found in OLD people table: ${person.first_name} ${person.last_name} (is_user: ${person.is_user})`);
        console.log('❌ Exchange client_ids are still pointing to the people table!');
      } else {
        console.log('❌ Client ID not found in either contacts or people table');
      }
    } else if (contact) {
      console.log(`✅ Client ID correctly references contacts table`);
      console.log(`Contact: ${contact.first_name} ${contact.last_name} - ${contact.company}`);
    }

    // Check table schemas to make sure they exist
    console.log('\n📊 Table checks:');
    
    const { count: contactsCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });
    
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    const { count: peopleCount } = await supabase
      .from('people')
      .select('*', { count: 'exact', head: true });

    console.log(`Contacts table: ${contactsCount || 0} records`);
    console.log(`Users table: ${usersCount || 0} records`);
    console.log(`People table: ${peopleCount || 0} records`);

    // Test a user-contact link
    const { data: testUser } = await supabase
      .from('users')
      .select('id, email, contact_id')
      .eq('role', 'client')
      .not('contact_id', 'is', null)
      .limit(1)
      .single();

    if (testUser) {
      console.log(`\n🧪 Testing user-contact link:`);
      console.log(`User: ${testUser.email}, Contact ID: ${testUser.contact_id}`);
      
      const { data: linkedContact } = await supabase
        .from('contacts')
        .select('id, first_name, last_name, email')
        .eq('id', testUser.contact_id)
        .single();

      if (linkedContact) {
        console.log(`✅ User correctly linked to contact: ${linkedContact.first_name} ${linkedContact.last_name}`);
      } else {
        console.log(`❌ User's contact_id doesn't match any contact`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

verifyContactsSchema();