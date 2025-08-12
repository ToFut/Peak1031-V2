const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addAdminToExchange() {
  const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
  const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce'; // admin@peak1031.com
  
  console.log('🔧 Adding admin as participant to SEGEV DEMO exchange...\n');
  
  // Check if admin is already a participant
  const { data: existing } = await supabase
    .from('exchange_participants')
    .select('*')
    .eq('exchange_id', exchangeId)
    .eq('user_id', adminUserId)
    .single();
    
  if (existing) {
    console.log('✅ Admin is already a participant');
    return;
  }
  
  // First, let's check the schema
  const { data: sample } = await supabase
    .from('exchange_participants')
    .select('*')
    .limit(1);
    
  console.log('Sample participant:', sample);
  
  // Add admin as participant with correct schema
  const participantData = {
    exchange_id: exchangeId,
    user_id: adminUserId,
    role: 'admin',
    permissions: JSON.stringify({
      view: true,
      edit: true,
      upload: true,
      message: true,
      manage: true
    }),
    assigned_by: adminUserId,
    is_active: true
  };
  
  console.log('Inserting participant data:', participantData);
  
  const { data, error } = await supabase
    .from('exchange_participants')
    .insert(participantData);
    
  if (error) {
    console.error('❌ Error adding admin:', error);
  } else {
    console.log('✅ Admin added as participant successfully');
  }
  
  // Also update the exchange to have a coordinator
  const { error: updateError } = await supabase
    .from('exchanges')
    .update({ coordinator_id: adminUserId })
    .eq('id', exchangeId);
    
  if (updateError) {
    console.error('❌ Error setting coordinator:', updateError);
  } else {
    console.log('✅ Admin set as coordinator');
  }
}

addAdminToExchange();