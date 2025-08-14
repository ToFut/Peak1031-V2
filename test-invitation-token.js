const axios = require('axios');

// Test token from the URL you mentioned
const testToken = 'be24c1c62f3e6e144f85ba604904c65965566bf98567139e51a1f033bcb78e83';

async function testInvitationToken() {
  console.log('🔍 Testing invitation token:', testToken);
  console.log('🔗 Token length:', testToken.length);
  
  try {
    // Test locally first
    console.log('\n📍 Testing localhost:5001...');
    const localResponse = await axios.get(`http://localhost:5001/api/invitations/details/${testToken}`, {
      timeout: 5000
    });
    console.log('✅ Local response:', localResponse.data);
  } catch (localError) {
    console.log('❌ Local error:', localError.response?.status, localError.response?.data || localError.message);
  }

  try {
    // Test production
    console.log('\n🌐 Testing production...');
    const prodResponse = await axios.get(`https://peak1031-v2-8uus.vercel.app/api/invitations/details/${testToken}`, {
      timeout: 10000
    });
    console.log('✅ Production response:', prodResponse.data);
  } catch (prodError) {
    console.log('❌ Production error:', prodError.response?.status, prodError.response?.data || prodError.message);
  }

  // Also test the invitation-auth service
  try {
    console.log('\n🔐 Testing invitation-auth validation...');
    const authResponse = await axios.get(`http://localhost:5001/api/invitation-auth/validate/${testToken}`, {
      timeout: 5000
    });
    console.log('✅ Auth validation response:', authResponse.data);
  } catch (authError) {
    console.log('❌ Auth validation error:', authError.response?.status, authError.response?.data || authError.message);
  }
}

testInvitationToken().catch(console.error);