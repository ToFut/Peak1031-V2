const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkContactsStructure() {
  try {
    console.log('🔍 Checking contacts table structure...\n');

    // Get a sample contact to see the structure
    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .limit(1);

    if (error) {
      console.log('❌ Error accessing contacts table:', error.message);
      return;
    }

    if (contacts && contacts.length > 0) {
      console.log('📋 Contacts table structure (sample record):');
      const sampleContact = contacts[0];
      Object.keys(sampleContact).forEach(key => {
        console.log(`   ${key}: ${sampleContact[key]}`);
      });
    } else {
      console.log('❌ No contacts found');
    }

    // Now get exchange participants with correct contact fields
    console.log('\n🔍 Checking exchange participants with correct contact fields...');
    const { data: participants, error: participantsError } = await supabase
      .from('exchange_participants')
      .select(`
        *,
        contacts:contact_id (
          id,
          first_name,
          last_name,
          email,
          phone
        ),
        exchanges:exchange_id (
          id,
          name,
          exchange_name,
          status
        )
      `);

    if (participantsError) {
      console.log('❌ Error accessing exchange_participants table:', participantsError.message);
      return;
    }

    if (participants && participants.length > 0) {
      console.log(`✅ Found ${participants.length} exchange participants:`);
      participants.forEach((participant, index) => {
        console.log(`\n${index + 1}. Participant ID: ${participant.id}`);
        console.log(`   Exchange: ${participant.exchanges?.name || participant.exchanges?.exchange_name || 'N/A'}`);
        console.log(`   Exchange ID: ${participant.exchange_id}`);
        console.log(`   Exchange Status: ${participant.exchanges?.status || 'N/A'}`);
        console.log(`   Role: ${participant.role}`);
        
        if (participant.contacts) {
          console.log(`   Contact: ${participant.contacts.first_name} ${participant.contacts.last_name}`);
          console.log(`   Contact Email: ${participant.contacts.email || 'N/A'}`);
          console.log(`   Contact Phone: ${participant.contacts.phone || 'N/A'}`);
        } else {
          console.log(`   Contact: N/A`);
        }
        
        console.log(`   Created: ${participant.created_at}`);
      });
    } else {
      console.log('❌ No exchange participants found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkContactsStructure(); 