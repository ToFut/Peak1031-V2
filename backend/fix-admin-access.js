const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function fixAdminAccess() {
  console.log('🔧 Fixing Admin Access to Exchanges');
  console.log('==================================');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Step 1: Find the admin user
    console.log('\n👤 Step 1: Finding admin user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', 'admin@peak1031.com')
      .single();
    
    if (adminError || !adminUser) {
      console.error('❌ Admin user not found:', adminError);
      return;
    }
    
    console.log(`✅ Found admin user: ${adminUser.email} (${adminUser.id})`);

    // Step 2: Find some active exchanges to give admin access to
    console.log('\n📋 Step 2: Finding active exchanges...');
    const { data: exchanges, error: exchangesError } = await supabase
      .from('exchanges')
      .select('id, name, status')
      .eq('is_active', true)
      .limit(5);
    
    if (exchangesError || !exchanges || exchanges.length === 0) {
      console.error('❌ No active exchanges found:', exchangesError);
      return;
    }
    
    console.log(`✅ Found ${exchanges.length} active exchanges to give admin access to:`);
    exchanges.forEach(exchange => {
      console.log(`   - ${exchange.name} (${exchange.status})`);
    });

    // Step 3: Add admin as coordinator to the first exchange
    console.log('\n👑 Step 3: Making admin coordinator of first exchange...');
    const firstExchange = exchanges[0];
    
    const { error: updateError } = await supabase
      .from('exchanges')
      .update({ coordinator_id: adminUser.id })
      .eq('id', firstExchange.id);
    
    if (updateError) {
      console.error('❌ Error updating exchange coordinator:', updateError);
    } else {
      console.log(`✅ Made admin coordinator of: ${firstExchange.name}`);
    }

    // Step 4: Add admin as participant to other exchanges
    console.log('\n👥 Step 4: Adding admin as participant to other exchanges...');
    for (let i = 1; i < exchanges.length; i++) {
      const exchange = exchanges[i];
      
      const { error: participantError } = await supabase
        .from('exchange_participants')
        .insert({
          exchange_id: exchange.id,
          user_id: adminUser.id,
          role: 'admin',
          is_active: true
        });
      
      if (participantError) {
        console.error(`❌ Error adding admin as participant to ${exchange.name}:`, participantError);
      } else {
        console.log(`✅ Added admin as participant to: ${exchange.name}`);
      }
    }

    // Step 5: Verify the changes
    console.log('\n✅ Step 5: Verifying changes...');
    
    // Check coordinator access
    const { data: coordinatorExchanges, error: coordError } = await supabase
      .from('exchanges')
      .select('id, name, status')
      .eq('coordinator_id', adminUser.id);
    
    if (!coordError && coordinatorExchanges) {
      console.log(`✅ Admin is now coordinator of ${coordinatorExchanges.length} exchanges:`);
      coordinatorExchanges.forEach(exchange => {
        console.log(`   - ${exchange.name} (${exchange.status})`);
      });
    }
    
    // Check participant access
    const { data: participantExchanges, error: partError } = await supabase
      .from('exchange_participants')
      .select('exchange_id, role, is_active')
      .eq('user_id', adminUser.id)
      .eq('is_active', true);
    
    if (!partError && participantExchanges) {
      console.log(`✅ Admin is now participant in ${participantExchanges.length} exchanges:`);
      participantExchanges.forEach(participation => {
        console.log(`   - Exchange: ${participation.exchange_id} - Role: ${participation.role}`);
      });
    }

    console.log('\n🎉 Admin access fixed! The admin user should now be able to upload documents.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixAdminAccess().then(() => {
  console.log('\n✅ Fix completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
