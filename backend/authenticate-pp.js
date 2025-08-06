require('dotenv').config({ path: '../.env' });

console.log('🔐 AUTHENTICATING WITH PRACTICEPANTHER\n');

async function authenticateWithPP() {
  try {
    // Import the existing service instance
    const ppService = require('./services/practicePartnerService');
    
    if (!ppService) {
      console.log('❌ PracticePartnerService not available - check Supabase configuration');
      return;
    }
    
    console.log('📋 Configuration Check:');
    console.log('- PP_CLIENT_ID:', process.env.PP_CLIENT_ID ? '✅ Present' : '❌ Missing');
    console.log('- PP_CLIENT_SECRET:', process.env.PP_CLIENT_SECRET ? '✅ Present' : '❌ Missing');
    console.log('- PP_AUTH_CODE:', process.env.PP_AUTH_CODE ? '✅ Present' : '❌ Missing');
    console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Present' : '❌ Missing');
    console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Present' : '❌ Missing');

    if (!process.env.PP_CLIENT_ID || !process.env.PP_CLIENT_SECRET || !process.env.PP_AUTH_CODE) {
      console.log('\n❌ Missing required credentials');
      return;
    }
    
    console.log('\n🔄 Exchanging auth code for access token...');
    
    // Exchange the auth code for a token
    const tokenData = await ppService.exchangeCodeForToken(process.env.PP_AUTH_CODE);
    
    if (!tokenData) {
      console.log('❌ Failed to exchange auth code for token');
      return;
    }

    console.log('✅ Token exchange successful!');
    console.log('- Access token received');
    console.log('- Expires in:', tokenData.expires_in, 'seconds');
    
    console.log('\n💾 Storing token in database...');
    
    // Store the token using the service
    const stored = await ppService.storeToken(tokenData);
    
    if (!stored) {
      console.log('❌ Failed to store token');
      return;
    }

    console.log('✅ Token stored successfully!');
    
    console.log('\n🧪 Testing connection...');
    
    // Test the connection
    const testResult = await ppService.testConnection();
    
    if (testResult) {
      console.log('✅ Connection test successful!');
      console.log('\n🎉 PracticePanther authentication complete!');
      console.log('You can now run data sync operations.');
    } else {
      console.log('❌ Connection test failed');
    }

  } catch (error) {
    console.log('❌ Authentication failed:', error.message);
    console.log('Error details:', error);
  }
}

authenticateWithPP(); 