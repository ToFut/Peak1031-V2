/**
 * Simple test to verify invitation display issue
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testInvitationFetch() {
  console.log('🔍 Testing Invitation Fetch Issue\n');
  
  // Step 1: Get the first available exchange
  console.log('1️⃣ Getting available exchanges...');
  const { data: exchanges, error: exchError } = await supabase
    .from('exchanges')
    .select('id, exchange_name, exchange_number')
    .limit(5);
  
  if (exchError) {
    console.error('❌ Failed to get exchanges:', exchError);
    return;
  }
  
  console.log('✅ Found exchanges:', exchanges?.map(e => ({
    id: e.id,
    name: e.exchange_name || e.exchange_number
  })));
  
  if (!exchanges || exchanges.length === 0) {
    console.log('❌ No exchanges found in database');
    return;
  }
  
  const testExchangeId = exchanges[0].id;
  console.log(`\n📍 Using exchange: ${testExchangeId}`);
  
  // Step 2: Create a test invitation directly in the database
  console.log('\n2️⃣ Creating test invitation...');
  const crypto = require('crypto');
  const invitationToken = crypto.randomBytes(32).toString('hex');
  
  // First get a user to use as inviter
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .limit(1);
  
  const inviterId = users?.[0]?.id || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // fallback UUID
  
  const { data: newInvitation, error: createError } = await supabase
    .from('invitations')
    .insert({
      exchange_id: testExchangeId,
      email: `test${Date.now()}@example.com`,
      role: 'client',
      invitation_token: invitationToken,
      status: 'pending',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      custom_message: 'Test invitation message',
      invited_by: inviterId
    })
    .select()
    .single();
  
  if (createError) {
    console.error('❌ Failed to create invitation:', createError);
    return;
  }
  
  console.log('✅ Created invitation:', {
    id: newInvitation.id,
    email: newInvitation.email,
    token: newInvitation.invitation_token ? 'Present' : 'Missing'
  });
  
  // Step 3: Fetch all invitations for this exchange
  console.log('\n3️⃣ Fetching invitations for exchange...');
  const { data: invitations, error: fetchError } = await supabase
    .from('invitations')
    .select('*')
    .eq('exchange_id', testExchangeId)
    .order('created_at', { ascending: false });
  
  if (fetchError) {
    console.error('❌ Failed to fetch invitations:', fetchError);
    return;
  }
  
  console.log('✅ Found invitations:', {
    count: invitations?.length || 0,
    invitations: invitations?.slice(0, 5).map(inv => ({
      email: inv.email,
      status: inv.status,
      hasToken: !!inv.invitation_token,
      created: inv.created_at
    }))
  });
  
  // Step 4: Test the invitationAuthService method
  console.log('\n4️⃣ Testing InvitationAuthService.getExchangeInvitations()...');
  const InvitationAuthService = require('./services/invitationAuthService');
  
  try {
    const serviceInvitations = await InvitationAuthService.getExchangeInvitations(testExchangeId);
    console.log('✅ Service returned:', {
      count: serviceInvitations?.length || 0,
      invitations: serviceInvitations?.slice(0, 3).map(inv => ({
        email: inv.email,
        hasToken: !!inv.token,
        hasInvitationToken: !!inv.invitation_token,
        hasMessage: !!inv.message,
        hasCustomMessage: !!inv.custom_message
      }))
    });
  } catch (error) {
    console.error('❌ Service failed:', error);
  }
  
  console.log('\n✅ Test complete!');
}

testInvitationFetch().catch(console.error);