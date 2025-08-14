/**
 * Test to debug why Pending Invitations shows (0) after inviting existing users
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testInvitationDisplay() {
  console.log('🧪 Testing Invitation Display Issue\n');
  
  // Step 1: Use the exchange from the server logs
  const exchangeId = 'df7ea956-a936-45c6-b683-143e9dda5230'; // From server logs
  
  // Get exchange details
  const { data: exchange } = await supabase
    .from('exchanges')
    .select('id, exchange_name')
    .eq('id', exchangeId)
    .single();
  
  if (!exchange) {
    console.log('❌ Exchange not found:', exchangeId);
    return;
  }
  console.log(`📍 Using exchange: ${exchangeId} (${exchange.exchange_name})\n`);
  
  // Step 2: Check current invitations
  console.log('1️⃣ Current invitations in database:');
  const { data: currentInvitations } = await supabase
    .from('invitations')
    .select('*')
    .eq('exchange_id', exchangeId);
  
  console.log(`   Found ${currentInvitations?.length || 0} existing invitations`);
  if (currentInvitations && currentInvitations.length > 0) {
    currentInvitations.forEach((inv, i) => {
      console.log(`   ${i + 1}. ${inv.email} - ${inv.status} (${inv.invitation_token ? 'has token' : 'no token'})`);
    });
  }
  
  // Step 3: Test the API endpoint that frontend uses
  console.log('\n2️⃣ Testing invitation-auth API endpoint:');
  try {
    // Login first
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    
    // Call the same endpoint the frontend uses
    const apiResponse = await axios.get(
      `${BASE_URL}/invitation-auth/exchange/${exchangeId}/invitations`,
      { headers }
    );
    
    console.log('   API Response:', {
      success: apiResponse.data.success,
      count: apiResponse.data.invitations?.length || 0,
      invitations: apiResponse.data.invitations?.map(inv => ({
        email: inv.email,
        status: inv.status,
        hasToken: !!inv.token,
        created: inv.created_at
      }))
    });
    
    // Step 4: Compare database vs API response
    console.log('\n3️⃣ Comparison:');
    console.log(`   Database count: ${currentInvitations?.length || 0}`);
    console.log(`   API response count: ${apiResponse.data.invitations?.length || 0}`);
    
    if ((currentInvitations?.length || 0) !== (apiResponse.data.invitations?.length || 0)) {
      console.log('   ⚠️ MISMATCH! API is not returning all invitations from database');
    } else {
      console.log('   ✅ Counts match');
    }
    
    // Step 5: Check if there are any filters applied
    console.log('\n4️⃣ Raw database query (no filters):');
    const { data: allInvitations } = await supabase
      .from('invitations')
      .select('*')
      .eq('exchange_id', exchangeId);
    
    console.log(`   All invitations for exchange: ${allInvitations?.length || 0}`);
    
    if (allInvitations && allInvitations.length > 0) {
      const statusCounts = allInvitations.reduce((acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('   Status breakdown:', statusCounts);
    }
    
  } catch (error) {
    console.error('   API Error:', error.response?.data || error.message);
  }
}

testInvitationDisplay().catch(console.error);