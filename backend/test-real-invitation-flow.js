/**
 * Test the exact flow: Send invitation → Open Manage Invitations → Check count
 */

require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';
const TEST_EXCHANGE_ID = 'df7ea956-a936-45c6-b683-143e9dda5230';

async function testRealFlow() {
  console.log('🎯 Testing Real User Flow\n');
  
  try {
    // Step 1: Login as admin
    console.log('1️⃣ Logging in as admin...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@peak1031.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.token;
    const headers = { Authorization: `Bearer ${token}` };
    console.log('   ✅ Login successful');
    
    // Step 2: Check current invitation count
    console.log('\n2️⃣ Checking current invitations...');
    const beforeResponse = await axios.get(
      `${BASE_URL}/invitation-auth/exchange/${TEST_EXCHANGE_ID}/invitations`,
      { headers }
    );
    
    console.log(`   Current count: ${beforeResponse.data.invitations?.length || 0}`);
    
    // Step 3: Send invitation to existing user
    const testEmail = `testuser${Date.now()}@example.com`;
    console.log(`\n3️⃣ Sending invitation to NEW user: ${testEmail}`);
    
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
        message: 'Welcome!'
      },
      { headers }
    );
    
    console.log('   Send result:', {
      success: sendResponse.data.success,
      totalSent: sendResponse.data.totalSent,
      results: sendResponse.data.results?.map(r => ({
        email: r.email,
        status: r.status
      }))
    });
    
    // Step 4: Wait a moment for DB write
    console.log('\n4️⃣ Waiting for database write...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 5: Check invitations again (simulating opening "Manage Invitations")
    console.log('\n5️⃣ Opening "Manage Invitations" (fresh fetch)...');
    const afterResponse = await axios.get(
      `${BASE_URL}/invitation-auth/exchange/${TEST_EXCHANGE_ID}/invitations`,
      { headers }
    );
    
    console.log(`   New count: ${afterResponse.data.invitations?.length || 0}`);
    console.log('   Latest invitation:', afterResponse.data.invitations?.[0] ? {
      email: afterResponse.data.invitations[0].email,
      status: afterResponse.data.invitations[0].status,
      hasToken: !!afterResponse.data.invitations[0].token
    } : 'None');
    
    // Step 6: Now test with existing user
    console.log('\n6️⃣ Sending invitation to EXISTING user: abol@peakcorp.com');
    
    const existingUserResponse = await axios.post(
      `${BASE_URL}/invitations/${TEST_EXCHANGE_ID}/send`,
      {
        invitations: [{
          email: 'abol@peakcorp.com',
          role: 'client',
          method: 'email',
          firstName: 'Abol',
          lastName: 'Admin'
        }],
        message: 'You are added to exchange!'
      },
      { headers }
    );
    
    console.log('   Existing user result:', {
      success: existingUserResponse.data.success,
      totalSent: existingUserResponse.data.totalSent,
      results: existingUserResponse.data.results?.map(r => ({
        email: r.email,
        status: r.status
      }))
    });
    
    // Step 7: Check invitations after existing user
    console.log('\n7️⃣ Checking invitations after adding existing user...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const finalResponse = await axios.get(
      `${BASE_URL}/invitation-auth/exchange/${TEST_EXCHANGE_ID}/invitations`,
      { headers }
    );
    
    console.log(`   Final count: ${finalResponse.data.invitations?.length || 0}`);
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Before: ${beforeResponse.data.invitations?.length || 0} invitations`);
    console.log(`   After new user: ${afterResponse.data.invitations?.length || 0} invitations`);
    console.log(`   After existing user: ${finalResponse.data.invitations?.length || 0} invitations`);
    
    const beforeCount = beforeResponse.data.invitations?.length || 0;
    const afterNewCount = afterResponse.data.invitations?.length || 0;
    const finalCount = finalResponse.data.invitations?.length || 0;
    
    if (afterNewCount > beforeCount) {
      console.log('   ✅ New user invitation was added');
    } else {
      console.log('   ❌ New user invitation was NOT added');
    }
    
    if (finalCount > afterNewCount) {
      console.log('   ✅ Existing user invitation was added');
    } else {
      console.log('   ⚠️ Existing user did not create new invitation (expected behavior)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

testRealFlow();