/**
 * Debug script specifically for Johnson Trust Apartment Complex Exchange
 * This will show exactly what data is available
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const JOHNSON_TRUST_ID = '8d1ea5f1-308a-48bd-b39a-6456d1b7c97f';

async function debugJohnsonTrust() {
  console.log('🏢 Johnson Trust Apartment Complex Exchange Debug\n');
  console.log(`Exchange ID: ${JOHNSON_TRUST_ID}\n`);

  try {
    // 1. Get exchange details
    console.log('1️⃣ Exchange Details:');
    const { data: exchange } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', JOHNSON_TRUST_ID)
      .single();
    
    console.log(`   Name: ${exchange?.exchange_name || 'Unknown'}`);
    console.log(`   Status: ${exchange?.status || 'Unknown'}\n`);

    // 2. Get participants
    console.log('2️⃣ Current Participants:');
    const { data: participants } = await supabase
      .from('exchange_participants')
      .select(`
        *,
        contacts (
          first_name,
          last_name,
          email,
          phone
        ),
        users (
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('exchange_id', JOHNSON_TRUST_ID)
      .eq('is_active', true);

    console.log(`   Found ${participants?.length || 0} active participants:`);
    if (participants && participants.length > 0) {
      participants.forEach((p, i) => {
        const user = p.users || p.contacts;
        console.log(`   ${i + 1}. ${user?.first_name || 'Unknown'} ${user?.last_name || ''} (${user?.email || 'No email'}) - ${p.role}`);
      });
    }
    console.log();

    // 3. Get invitations
    console.log('3️⃣ All Invitations:');
    const { data: invitations } = await supabase
      .from('invitations')
      .select('*')
      .eq('exchange_id', JOHNSON_TRUST_ID)
      .order('created_at', { ascending: false });

    console.log(`   Found ${invitations?.length || 0} invitations:`);
    if (invitations && invitations.length > 0) {
      invitations.forEach((inv, i) => {
        console.log(`   ${i + 1}. ${inv.email} - ${inv.status} (${inv.role}) - Created: ${new Date(inv.created_at).toLocaleDateString()}`);
      });
    }
    console.log();

    // 4. Test the API endpoints that frontend might use
    console.log('4️⃣ API Endpoint Simulation:');
    
    // Simulate invitation-auth endpoint
    console.log('   invitation-auth endpoint would return:');
    const transformedInvitations = invitations?.map(inv => ({
      ...inv,
      token: inv.invitation_token,
      message: inv.custom_message,
      invited_by: inv.invited_by ? { id: inv.invited_by } : undefined
    })) || [];
    
    console.log(`   {
      success: true,
      invitations: [${transformedInvitations.length} items]
    }`);
    
    // Show first few invitations
    if (transformedInvitations.length > 0) {
      console.log('   First invitation:');
      console.log(`   {
        email: "${transformedInvitations[0].email}",
        status: "${transformedInvitations[0].status}",
        token: "${transformedInvitations[0].token ? 'present' : 'missing'}",
        role: "${transformedInvitations[0].role}"
      }`);
    }
    console.log();

    // 5. Summary for frontend developers
    console.log('📋 SUMMARY FOR FRONTEND:');
    console.log(`   • Exchange has ${participants?.length || 0} active participants`);
    console.log(`   • Exchange has ${invitations?.length || 0} total invitations`);
    console.log(`   • Pending invitations: ${invitations?.filter(inv => inv.status === 'pending').length || 0}`);
    console.log(`   • Accepted invitations: ${invitations?.filter(inv => inv.status === 'accepted' || inv.status === 'auto_accepted').length || 0}`);
    console.log();
    
    const pendingCount = invitations?.filter(inv => inv.status === 'pending').length || 0;
    const activeCount = participants?.length || 0;
    
    if (pendingCount === 0 && activeCount > 0) {
      console.log('💡 EXPLANATION:');
      console.log('   The "Pending Invitations (0)" is CORRECT because:');
      console.log('   - All users have been added as active participants');
      console.log('   - There are no pending invitations waiting for acceptance');
      console.log('   - This is expected behavior when inviting existing users');
    } else if (pendingCount > 0) {
      console.log('❓ ISSUE:');
      console.log(`   There ARE ${pendingCount} pending invitations in the database`);
      console.log('   but the frontend is showing 0. This suggests:');
      console.log('   - Frontend is not calling the correct API endpoint');
      console.log('   - Or there\'s an issue with the API response handling');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugJohnsonTrust();