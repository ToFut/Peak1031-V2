const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkParticipants() {
  try {
    console.log('🔍 Checking exchange participants...\n');

    // Check if exchange_participants table exists and has data
    const { data: participants, error } = await supabase
      .from('exchange_participants')
      .select('*');

    if (error) {
      console.log('❌ Error accessing exchange_participants table:', error.message);
      console.log('This might mean the table doesn\'t exist or there are permission issues.');
      return;
    }

    if (participants && participants.length > 0) {
      console.log(`✅ Found ${participants.length} exchange participants:`);
      participants.forEach((participant, index) => {
        console.log(`\n${index + 1}. Participant ID: ${participant.id}`);
        console.log(`   Exchange ID: ${participant.exchange_id}`);
        console.log(`   User ID: ${participant.user_id || 'N/A'}`);
        console.log(`   Contact ID: ${participant.contact_id || 'N/A'}`);
        console.log(`   Role: ${participant.role}`);
        console.log(`   Created: ${participant.created_at}`);
      });
    } else {
      console.log('❌ No exchange participants found in database');
    }

    // Check exchanges table
    console.log('\n🏢 Checking exchanges table...');
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select('*');

    if (exchangesError) {
      console.log('❌ Error accessing exchanges table:', exchangesError.message);
    } else {
      console.log(`📊 Found ${exchanges?.length || 0} exchanges in database`);
      if (exchanges && exchanges.length > 0) {
        console.log('Sample exchanges:');
        exchanges.slice(0, 3).forEach((exchange, index) => {
          console.log(`\n${index + 1}. Exchange: ${exchange.name || exchange.exchange_name || 'Unnamed'}`);
          console.log(`   ID: ${exchange.id}`);
          console.log(`   Status: ${exchange.status || 'N/A'}`);
          console.log(`   Coordinator ID: ${exchange.coordinator_id || 'N/A'}`);
          console.log(`   Client ID: ${exchange.client_id || 'N/A'}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkParticipants(); 