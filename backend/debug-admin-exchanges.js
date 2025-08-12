const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugAdminExchanges() {
  console.log('🔍 Debugging admin exchange access...\n');
  
  // 1. Check total exchanges
  const { data: allExchanges, count: totalCount } = await supabase
    .from('exchanges')
    .select('*', { count: 'exact' });
    
  console.log(`Total exchanges in database: ${totalCount}`);
  
  // 2. Check active exchanges
  const { data: activeExchanges, count: activeCount } = await supabase
    .from('exchanges')
    .select('*', { count: 'exact' })
    .eq('is_active', true);
    
  console.log(`Active exchanges: ${activeCount}`);
  
  // 3. Check SEGEV DEMO specifically
  const { data: segevExchange } = await supabase
    .from('exchanges')
    .select('*')
    .eq('id', 'ba7865ac-da20-404a-b609-804d15cb0467')
    .single();
    
  console.log('\nSEGEV DEMO exchange:');
  console.log('- Name:', segevExchange?.name);
  console.log('- Is Active:', segevExchange?.is_active);
  console.log('- Status:', segevExchange?.status);
  console.log('- Coordinator ID:', segevExchange?.coordinator_id);
  
  // 4. Check what the API would return for admin
  const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
  
  // Simulate the where clause for admin (should be minimal)
  const { data: adminExchanges } = await supabase
    .from('exchanges')
    .select('id, name, status, is_active')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(60);
    
  console.log(`\nAdmin should see ${adminExchanges?.length} exchanges`);
  
  // Check if SEGEV DEMO is in the list
  const hasSegev = adminExchanges?.some(ex => ex.id === 'ba7865ac-da20-404a-b609-804d15cb0467');
  console.log('SEGEV DEMO in admin list:', hasSegev);
  
  if (!hasSegev && segevExchange) {
    console.log('\n⚠️  SEGEV DEMO exists but not in admin list!');
    console.log('Possible reasons:');
    if (!segevExchange.is_active) {
      console.log('- Exchange is inactive');
    }
    if (adminExchanges?.length >= 50) {
      console.log('- Exchange might be beyond the limit (pagination issue)');
    }
  }
}

debugAdminExchanges();