const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addAdminToSegevDemo() {
  console.log('🔧 Adding admin to SEGEV DEMO exchange...\n');
  
  const adminUserId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
  const adminContactId = '278304de-568f-4138-b35b-6fdcfbd2f1ce';
  const exchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
  
  // Check if admin is already a participant
  const { data: existing } = await supabase
    .from('exchange_participants')
    .select('*')
    .eq('exchange_id', exchangeId)
    .eq('contact_id', adminContactId)
    .single();
    
  if (existing) {
    console.log('✅ Admin is already a participant');
    console.log('- Role:', existing.role);
    console.log('- Permissions:', existing.permissions);
    return;
  }
  
  // Add admin as participant
  console.log('Adding admin as participant...');
  const { data, error } = await supabase
    .from('exchange_participants')
    .insert({
      exchange_id: exchangeId,
      contact_id: adminContactId,
      role: 'admin',
      permissions: ['read', 'comment', 'upload_documents', 'message', 'manage'],
      assigned_by: adminUserId,
      is_active: true
    })
    .select();
    
  if (error) {
    console.error('❌ Error adding admin:', error);
  } else {
    console.log('✅ Admin added as participant successfully');
    console.log('Data:', data);
  }
  
  // Verify the addition
  const { data: verification } = await supabase
    .from('exchange_participants')
    .select('*')
    .eq('exchange_id', exchangeId)
    .eq('contact_id', adminContactId)
    .single();
    
  if (verification) {
    console.log('\n✅ Verification: Admin is now a participant');
    console.log('- Role:', verification.role);
    console.log('- Permissions:', verification.permissions);
    console.log('- Active:', verification.is_active);
  }
}

addAdminToSegevDemo();