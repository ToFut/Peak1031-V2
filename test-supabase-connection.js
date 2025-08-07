require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseConnection() {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('📋 Supabase URL:', supabaseUrl ? 'Set' : 'Missing');
    console.log('🔑 Supabase Key:', supabaseKey ? 'Set' : 'Missing');
    console.log('✅ Supabase client created');

    // Test basic connection
    console.log('🔍 Testing database connection...');
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return;
    }

    console.log('✅ Supabase connection successful!');
    console.log('📊 Data:', data);

    // Check exchange participants
    console.log('\n🔍 Checking exchange participants...');
    
    // First check if the table exists
    const { data: participants, error: participantsError } = await supabase
      .from('exchange_participants')
      .select('*', { count: 'exact', head: true });

    if (participantsError) {
      console.log('❌ Exchange participants table error:', participantsError.message);
    } else {
      console.log(`📊 Total exchange participants: ${participants}`);
    }

    // Get actual participant records
    const { data: participantRecords, error: recordsError } = await supabase
      .from('exchange_participants')
      .select(`
        id,
        exchange_id,
        user_id,
        contact_id,
        role,
        created_at
      `)
      .limit(10);

    if (recordsError) {
      console.log('❌ Error fetching participant records:', recordsError.message);
    } else {
      if (participantRecords && participantRecords.length > 0) {
        console.log(`\n👥 Found ${participantRecords.length} exchange participants:`);
        participantRecords.forEach((participant, index) => {
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
    }

    // Check exchanges table
    console.log('\n🏢 Checking exchanges table...');
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select('id, name, exchange_name, status, coordinator_id, client_id')
      .limit(5);

    if (exchangesError) {
      console.log('❌ Error fetching exchanges:', exchangesError.message);
    } else {
      console.log(`📊 Found ${exchanges?.length || 0} exchanges:`);
      exchanges?.forEach((exchange, index) => {
        console.log(`\n${index + 1}. Exchange: ${exchange.name || exchange.exchange_name || 'Unnamed'}`);
        console.log(`   ID: ${exchange.id}`);
        console.log(`   Status: ${exchange.status || 'N/A'}`);
        console.log(`   Coordinator ID: ${exchange.coordinator_id || 'N/A'}`);
        console.log(`   Client ID: ${exchange.client_id || 'N/A'}`);
      });
    }

    // Check if there are any users that could be participants
    console.log('\n👤 Checking users table...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, role')
      .limit(5);

    if (usersError) {
      console.log('❌ Error fetching users:', usersError.message);
    } else {
      console.log(`📊 Found ${users?.length || 0} users:`);
      users?.forEach((user, index) => {
        console.log(`\n${index + 1}. User: ${user.first_name} ${user.last_name}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSupabaseConnection(); 