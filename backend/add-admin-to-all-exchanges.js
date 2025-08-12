const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addAdminToAllExchanges() {
  console.log('🔧 Adding admin to all exchanges...\n');
  
  const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
  const adminContactId = '278304de-568f-4138-b35b-6fdcfbd2f1ce'; // Admin's contact has same ID as user
  
  // 1. Get all active exchanges
  const { data: exchanges, count } = await supabase
    .from('exchanges')
    .select('id, name', { count: 'exact' })
    .eq('is_active', true);
    
  console.log(`Found ${count} active exchanges\n`);
  
  let addedCount = 0;
  let alreadyExistsCount = 0;
  let errorCount = 0;
  
  // 2. For each exchange, add admin as participant if not already
  for (const exchange of exchanges || []) {
    // Check if admin is already a participant
    const { data: existing } = await supabase
      .from('exchange_participants')
      .select('*')
      .eq('exchange_id', exchange.id)
      .eq('contact_id', adminContactId)
      .single();
      
    if (existing) {
      alreadyExistsCount++;
    } else {
      // Add admin as participant
      const { error } = await supabase
        .from('exchange_participants')
        .insert({
          exchange_id: exchange.id,
          contact_id: adminContactId,
          role: 'admin',
          permissions: ['read', 'comment', 'upload_documents', 'message', 'manage'],
          assigned_by: adminUserId,
          is_active: true
        });
        
      if (error) {
        console.error(`❌ Error adding admin to "${exchange.name}":`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Added admin to: ${exchange.name}`);
        addedCount++;
      }
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`- Total exchanges: ${count}`);
  console.log(`- Admin already participant in: ${alreadyExistsCount}`);
  console.log(`- Newly added to: ${addedCount}`);
  console.log(`- Errors: ${errorCount}`);
  
  // 3. Verify SEGEV DEMO specifically
  console.log('\n🔍 Verifying SEGEV DEMO exchange...');
  const { data: segevParticipant } = await supabase
    .from('exchange_participants')
    .select('*')
    .eq('exchange_id', 'ba7865ac-da20-404a-b609-804d15cb0467')
    .eq('contact_id', adminContactId)
    .single();
    
  if (segevParticipant) {
    console.log('✅ Admin is now a participant in SEGEV DEMO');
    console.log('- Role:', segevParticipant.role);
    console.log('- Active:', segevParticipant.is_active);
  } else {
    console.log('❌ Admin is NOT a participant in SEGEV DEMO - manual intervention needed');
  }
}

addAdminToAllExchanges();