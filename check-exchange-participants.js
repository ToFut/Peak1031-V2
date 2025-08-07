const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkExchangeParticipants() {
  try {
    console.log('🔍 Checking exchange participants...\n');

    // Check if exchange_participants table exists
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'exchange_participants');

    if (tableError) {
      console.log('🔍 Checking tables manually...');
    }

    // Check exchange_participants table structure
    console.log('📋 Exchange Participants Table Structure:');
    const { data: columns, error: columnError } = await supabase
      .rpc('get_table_columns', { table_name: 'exchange_participants' });

    if (columnError) {
      console.log('Using alternative method to check structure...');
      // Try to query the table directly
      const { data: sample, error: sampleError } = await supabase
        .from('exchange_participants')
        .select('*')
        .limit(1);

      if (sampleError) {
        console.log('❌ Table might not exist or have different structure');
        console.log('Error:', sampleError.message);
      } else {
        console.log('✅ Table exists and is accessible');
        if (sample && sample.length > 0) {
          console.log('Sample record:', sample[0]);
        }
      }
    } else {
      console.log('Columns:', columns);
    }

    // Count exchange participants
    console.log('\n📊 Exchange Participants Count:');
    const { count, error: countError } = await supabase
      .from('exchange_participants')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.log('❌ Error counting participants:', countError.message);
    } else {
      console.log(`Total participants: ${count}`);
    }

    // Get all exchange participants with details
    console.log('\n👥 Exchange Participants Details:');
    const { data: participants, error: participantsError } = await supabase
      .from('exchange_participants')
      .select(`
        *,
        exchanges:exchange_id (
          id,
          name,
          exchange_name,
          status
        ),
        users:user_id (
          id,
          first_name,
          last_name,
          email,
          role
        ),
        contacts:contact_id (
          id,
          first_name,
          last_name,
          email,
          company_name
        )
      `)
      .order('created_at', { ascending: false });

    if (participantsError) {
      console.log('❌ Error fetching participants:', participantsError.message);
    } else {
      if (participants && participants.length > 0) {
        console.log(`Found ${participants.length} participants:`);
        participants.forEach((participant, index) => {
          console.log(`\n${index + 1}. Participant ID: ${participant.id}`);
          console.log(`   Exchange: ${participant.exchanges?.name || participant.exchanges?.exchange_name || 'N/A'}`);
          console.log(`   Role: ${participant.role}`);
          console.log(`   User: ${participant.users ? `${participant.users.first_name} ${participant.users.last_name} (${participant.users.email})` : 'N/A'}`);
          console.log(`   Contact: ${participant.contacts ? `${participant.contacts.first_name} ${participant.contacts.last_name} (${participant.contacts.company_name || 'N/A'})` : 'N/A'}`);
          console.log(`   Created: ${participant.created_at}`);
        });
      } else {
        console.log('❌ No exchange participants found');
      }
    }

    // Check exchanges table for any participant-related fields
    console.log('\n🏢 Checking Exchanges Table:');
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select('id, name, exchange_name, status, coordinator_id, client_id')
      .limit(5);

    if (exchangesError) {
      console.log('❌ Error fetching exchanges:', exchangesError.message);
    } else {
      console.log(`Found ${exchanges?.length || 0} exchanges:`);
      exchanges?.forEach((exchange, index) => {
        console.log(`\n${index + 1}. Exchange: ${exchange.name || exchange.exchange_name}`);
        console.log(`   ID: ${exchange.id}`);
        console.log(`   Status: ${exchange.status}`);
        console.log(`   Coordinator ID: ${exchange.coordinator_id || 'N/A'}`);
        console.log(`   Client ID: ${exchange.client_id || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkExchangeParticipants(); 