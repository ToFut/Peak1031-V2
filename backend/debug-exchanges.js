const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function debugExchanges() {
  console.log('🔍 Debugging Exchange Access Issues');
  console.log('==================================');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Step 1: Check all users
    console.log('\n👥 Step 1: Checking all users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role, first_name, last_name, is_active')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError);
    } else {
      console.log(`✅ Found ${users.length} users:`);
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.role}) - Active: ${user.is_active}`);
      });
    }

    // Step 2: Check all exchanges
    console.log('\n📋 Step 2: Checking all exchanges...');
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select('id, name, status, coordinator_id, client_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (exchangesError) {
      console.error('❌ Error fetching exchanges:', exchangesError);
    } else {
      console.log(`✅ Found ${exchanges.length} exchanges:`);
      exchanges.forEach(exchange => {
        console.log(`   - ${exchange.name} (${exchange.status}) - Coordinator: ${exchange.coordinator_id} - Client: ${exchange.client_id}`);
      });
    }

    // Step 3: Check exchange participants
    console.log('\n👥 Step 3: Checking exchange participants...');
    const { data: participants, error: participantsError } = await supabase
      .from('exchange_participants')
      .select('exchange_id, user_id, contact_id, role, is_active')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (participantsError) {
      console.error('❌ Error fetching participants:', participantsError);
    } else {
      console.log(`✅ Found ${participants.length} exchange participants:`);
      participants.forEach(participant => {
        console.log(`   - Exchange: ${participant.exchange_id} - User: ${participant.user_id} - Contact: ${participant.contact_id} - Role: ${participant.role} - Active: ${participant.is_active}`);
      });
    }

    // Step 4: Check specific admin user
    console.log('\n👤 Step 4: Checking admin user specifically...');
    const adminUser = users?.find(u => u.role === 'admin');
    if (adminUser) {
      console.log(`🔍 Admin user: ${adminUser.email} (${adminUser.id})`);
      
      // Check if admin is coordinator of any exchanges
      const { data: adminExchanges, error: adminExchangesError } = await supabase
        .from('exchanges')
        .select('id, name, status')
        .eq('coordinator_id', adminUser.id);
      
      if (adminExchangesError) {
        console.error('❌ Error fetching admin exchanges:', adminExchangesError);
      } else {
        console.log(`✅ Admin is coordinator of ${adminExchanges.length} exchanges:`);
        adminExchanges.forEach(exchange => {
          console.log(`   - ${exchange.name} (${exchange.status})`);
        });
      }
      
      // Check if admin is participant in any exchanges
      const { data: adminParticipations, error: adminParticipationsError } = await supabase
        .from('exchange_participants')
        .select('exchange_id, role, is_active')
        .eq('user_id', adminUser.id)
        .eq('is_active', true);
      
      if (adminParticipationsError) {
        console.error('❌ Error fetching admin participations:', adminParticipationsError);
      } else {
        console.log(`✅ Admin is participant in ${adminParticipations.length} exchanges:`);
        adminParticipations.forEach(participation => {
          console.log(`   - Exchange: ${participation.exchange_id} - Role: ${participation.role}`);
        });
      }
    }

    // Step 5: Check if there are any exchanges at all
    console.log('\n📊 Step 5: Exchange statistics...');
    const { count: totalExchanges, error: countError } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('❌ Error counting exchanges:', countError);
    } else {
      console.log(`📊 Total exchanges in database: ${totalExchanges}`);
    }

    // Step 6: Check if there are any active exchanges
    const { data: activeExchanges, error: activeError } = await supabase
      .from('exchanges')
      .select('id, name, status')
      .eq('is_active', true);
    
    if (activeError) {
      console.error('❌ Error fetching active exchanges:', activeError);
    } else {
      console.log(`📊 Active exchanges: ${activeExchanges.length}`);
      if (activeExchanges.length === 0) {
        console.log('⚠️  No active exchanges found - this is likely the root cause!');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugExchanges().then(() => {
  console.log('\n✅ Debug completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
