/**
 * Test script to verify invitation flow is working correctly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const TEST_EMAIL = 'admin@peak1031.com';
const TEST_PASSWORD = 'admin123';

// Test data
const TEST_EXCHANGE_ID = 'c8f43bfc-d53b-41ec-8e27-dcf95bf0a61c'; // Use your actual exchange ID

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

async function testInvitationFlow(token) {
  const headers = { Authorization: `Bearer ${token}` };
  
  console.log('\n📧 Testing Invitation Flow...\n');
  
  // Step 1: Send an invitation via the regular invitation endpoint
  console.log('1️⃣ Sending invitation via /invitations/:exchangeId/send');
  try {
    const sendResponse = await axios.post(
      `${BASE_URL}/invitations/${TEST_EXCHANGE_ID}/send`,
      {
        invitations: [{
          email: `test${Date.now()}@example.com`,
          role: 'client',
          method: 'email',
          firstName: 'Test',
          lastName: 'User'
        }],
        message: 'Test invitation'
      },
      { headers }
    );
    
    console.log('✅ Invitation sent:', {
      totalSent: sendResponse.data.totalSent,
      results: sendResponse.data.results
    });
  } catch (error) {
    console.error('❌ Failed to send invitation:', error.response?.data || error.message);
  }
  
  // Step 2: Fetch invitations via invitation-auth endpoint
  console.log('\n2️⃣ Fetching invitations via /invitation-auth/exchange/:exchangeId/invitations');
  try {
    const fetchResponse = await axios.get(
      `${BASE_URL}/invitation-auth/exchange/${TEST_EXCHANGE_ID}/invitations`,
      { headers }
    );
    
    console.log('✅ Invitations fetched:', {
      success: fetchResponse.data.success,
      count: fetchResponse.data.invitations?.length || 0,
      invitations: fetchResponse.data.invitations?.slice(0, 3).map(inv => ({
        email: inv.email,
        status: inv.status,
        token: inv.token ? 'Present' : 'Missing',
        invitation_token: inv.invitation_token ? 'Present' : 'Missing',
        created_at: inv.created_at
      }))
    });
    
    // Check if invitations have the correct token field
    if (fetchResponse.data.invitations?.length > 0) {
      const firstInv = fetchResponse.data.invitations[0];
      console.log('\n📋 First invitation structure:');
      console.log({
        hasToken: !!firstInv.token,
        hasInvitationToken: !!firstInv.invitation_token,
        hasMessage: !!firstInv.message,
        hasCustomMessage: !!firstInv.custom_message
      });
    }
  } catch (error) {
    console.error('❌ Failed to fetch invitations:', error.response?.data || error.message);
  }
  
  // Step 3: Check direct database query for invitations
  console.log('\n3️⃣ Testing direct database query');
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
    
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('exchange_id', TEST_EXCHANGE_ID)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) throw error;
    
    console.log('✅ Direct database query result:', {
      count: invitations?.length || 0,
      invitations: invitations?.map(inv => ({
        email: inv.email,
        status: inv.status,
        invitation_token: inv.invitation_token ? 'Present' : 'Missing',
        created_at: inv.created_at
      }))
    });
  } catch (error) {
    console.error('❌ Database query failed:', error);
  }
}

async function main() {
  try {
    console.log('🚀 Starting Invitation Flow Test\n');
    
    // Load environment variables
    require('dotenv').config();
    
    // Login and get token
    const token = await login();
    
    // Test invitation flow
    await testInvitationFlow(token);
    
    console.log('\n✅ Test complete!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();