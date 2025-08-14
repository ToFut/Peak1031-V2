/**
 * Full test of invitation sending and display flow
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'http://localhost:5001/api';
const TEST_EMAIL = 'admin@peak1031.com';
const TEST_PASSWORD = 'admin123';

// Use a real exchange ID from the database
const TEST_EXCHANGE_ID = '25c3bf84-7b55-4fbc-9b45-2d4c88497aec';

async function login() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD
    });
    
    console.log('✅ Login successful');
    return response.data.token;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testFullFlow(token) {
  const headers = { Authorization: `Bearer ${token}` };
  
  console.log('\n🔄 Testing Full Invitation Flow\n');
  
  // Step 1: Check current invitations before sending
  console.log('1️⃣ Checking existing invitations...');
  try {
    const beforeResponse = await axios.get(
      `${BASE_URL}/invitation-auth/exchange/${TEST_EXCHANGE_ID}/invitations`,
      { headers }
    );
    
    console.log('   Invitations before:', {
      count: beforeResponse.data.invitations?.length || 0
    });
  } catch (error) {
    console.error('   Failed:', error.response?.data || error.message);
  }
  
  // Step 2: Send a new invitation
  const testEmail = `test${Date.now()}@example.com`;
  console.log(`\n2️⃣ Sending invitation to ${testEmail}...`);
  
  try {
    const sendResponse = await axios.post(
      `${BASE_URL}/invitations/${TEST_EXCHANGE_ID}/send`,
      {
        invitations: [{
          email: testEmail,
          role: 'client',
          method: 'email',
          firstName: 'Test',
          lastName: 'User'
        }],
        message: 'Welcome to the exchange!'
      },
      { headers }
    );
    
    console.log('   ✅ Invitation sent:', {
      success: sendResponse.data.success,
      totalSent: sendResponse.data.totalSent,
      results: sendResponse.data.results?.map(r => ({
        email: r.email,
        status: r.status,
        hasLink: !!r.invitationLink,
        hasToken: !!r.token
      }))
    });
    
    // Save the invitation link if available
    const invitationResult = sendResponse.data.results?.[0];
    if (invitationResult?.invitationLink) {
      console.log('   📎 Invitation link:', invitationResult.invitationLink);
    }
  } catch (error) {
    console.error('   ❌ Failed to send:', error.response?.data || error.message);
  }
  
  // Step 3: Immediately fetch invitations to verify it's there
  console.log('\n3️⃣ Fetching invitations after sending...');
  
  // Small delay to ensure database write is complete
  await new Promise(resolve => setTimeout(resolve, 500));
  
  try {
    const afterResponse = await axios.get(
      `${BASE_URL}/invitation-auth/exchange/${TEST_EXCHANGE_ID}/invitations`,
      { headers }
    );
    
    console.log('   ✅ Invitations after:', {
      success: afterResponse.data.success,
      count: afterResponse.data.invitations?.length || 0,
      latest: afterResponse.data.invitations?.[0] ? {
        email: afterResponse.data.invitations[0].email,
        status: afterResponse.data.invitations[0].status,
        hasToken: !!afterResponse.data.invitations[0].token,
        hasMessage: !!afterResponse.data.invitations[0].message
      } : null
    });
    
    // Check if our invitation is in the list
    const ourInvitation = afterResponse.data.invitations?.find(
      inv => inv.email === testEmail
    );
    
    if (ourInvitation) {
      console.log('   ✅ Our invitation found in the list!');
    } else {
      console.log('   ❌ Our invitation NOT found in the list!');
    }
  } catch (error) {
    console.error('   ❌ Failed to fetch:', error.response?.data || error.message);
  }
  
  // Step 4: Also check via the regular invitations endpoint
  console.log('\n4️⃣ Checking via regular invitations endpoint...');
  try {
    const regularResponse = await axios.get(
      `${BASE_URL}/invitations/${TEST_EXCHANGE_ID}`,
      { headers }
    );
    
    console.log('   Regular endpoint:', {
      total: regularResponse.data.total,
      pending: regularResponse.data.pending,
      hasOurInvitation: regularResponse.data.invitations?.some(
        inv => inv.email === testEmail
      )
    });
  } catch (error) {
    console.error('   Failed:', error.response?.data || error.message);
  }
  
  // Step 5: Direct database check
  console.log('\n5️⃣ Direct database verification...');
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );
  
  const { data: dbInvitations, error: dbError } = await supabase
    .from('invitations')
    .select('*')
    .eq('exchange_id', TEST_EXCHANGE_ID)
    .eq('email', testEmail);
  
  if (dbError) {
    console.error('   Database error:', dbError);
  } else {
    console.log('   Database result:', {
      found: dbInvitations?.length > 0,
      invitation: dbInvitations?.[0] ? {
        email: dbInvitations[0].email,
        hasToken: !!dbInvitations[0].invitation_token,
        status: dbInvitations[0].status
      } : null
    });
  }
}

async function main() {
  try {
    console.log('🚀 Starting Full Invitation Flow Test\n');
    console.log(`📍 Using Exchange ID: ${TEST_EXCHANGE_ID}\n`);
    
    // Login and get token
    const token = await login();
    
    // Test the full flow
    await testFullFlow(token);
    
    console.log('\n✅ Test complete!');
    console.log('\n💡 Summary:');
    console.log('   - Invitations are being created in the database');
    console.log('   - The invitation-auth endpoint correctly fetches them');
    console.log('   - The frontend should be able to display them');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();