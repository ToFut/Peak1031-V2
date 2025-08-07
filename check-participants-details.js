const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkParticipantsDetails() {
  try {
    console.log('🔍 Checking exchange participants with details...\n');

    // Get exchange participants with contact details
    const { data: participants, error } = await supabase
      .from('exchange_participants')
      .select(`
        *,
        contacts:contact_id (
          id,
          first_name,
          last_name,
          email,
          company_name,
          phone
        ),
        exchanges:exchange_id (
          id,
          name,
          exchange_name,
          status,
          created_at
        )
      `);

    if (error) {
      console.log('❌ Error accessing exchange_participants table:', error.message);
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
          console.log(`   Contact Company: ${participant.contacts.company_name || 'N/A'}`);
          console.log(`   Contact Phone: ${participant.contacts.phone || 'N/A'}`);
        } else {
          console.log(`   Contact: N/A`);
        }
        
        console.log(`   Created: ${participant.created_at}`);
      });
    } else {
      console.log('❌ No exchange participants found in database');
    }

    // Check how many exchanges have participants
    console.log('\n📊 Exchange Participants Summary:');
    const { data: exchangeSummary, error: summaryError } = await supabase
      .from('exchange_participants')
      .select('exchange_id, role')
      .order('exchange_id');

    if (summaryError) {
      console.log('❌ Error getting summary:', summaryError.message);
    } else {
      const exchangeMap = {};
      exchangeSummary?.forEach(participant => {
        if (!exchangeMap[participant.exchange_id]) {
          exchangeMap[participant.exchange_id] = [];
        }
        exchangeMap[participant.exchange_id].push(participant.role);
      });

      console.log(`📈 Exchanges with participants: ${Object.keys(exchangeMap).length}`);
      console.log(`👥 Total participant records: ${exchangeSummary?.length || 0}`);
      
      Object.entries(exchangeMap).forEach(([exchangeId, roles]) => {
        console.log(`   Exchange ${exchangeId}: ${roles.join(', ')}`);
      });
    }

    // Check contacts table to see available contacts
    console.log('\n👤 Checking contacts table...');
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, first_name, last_name, email, company_name')
      .limit(10);

    if (contactsError) {
      console.log('❌ Error accessing contacts table:', contactsError.message);
    } else {
      console.log(`📊 Found ${contacts?.length || 0} contacts (showing first 10):`);
      contacts?.forEach((contact, index) => {
        console.log(`\n${index + 1}. Contact: ${contact.first_name} ${contact.last_name}`);
        console.log(`   ID: ${contact.id}`);
        console.log(`   Email: ${contact.email || 'N/A'}`);
        console.log(`   Company: ${contact.company_name || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkParticipantsDetails(); 