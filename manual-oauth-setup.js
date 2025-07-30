require('dotenv').config({ path: './backend/.env' });
const practicePartnerService = require('./backend/services/practicePartnerService');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function manualOAuthSetup() {
  console.log('🔐 Manual PracticePanther OAuth Setup\n');
  
  try {
    // Step 1: Generate authorization URL
    console.log('📋 Step 1: Authorization URL');
    const state = Math.random().toString(36).substring(7);
    const authUrl = practicePartnerService.generateAuthUrl(state);
    
    console.log('🔗 Please visit this URL to authorize the application:');
    console.log('\n' + authUrl + '\n');
    console.log('📝 Instructions:');
    console.log('1. Copy the URL above and paste it in your browser');
    console.log('2. Log into PracticePanther and authorize the application');
    console.log('3. After authorization, you will be redirected to a URL like:');
    console.log('   https://localhost:8000/?code=AUTHORIZATION_CODE&state=' + state);
    console.log('4. Copy ONLY the authorization code from the URL');
    console.log('   (everything after "code=" and before "&state")');
    console.log('');
    
    // Step 2: Get authorization code from user
    const authCode = await new Promise((resolve) => {
      rl.question('🔑 Please paste the authorization code here: ', (code) => {
        resolve(code.trim());
      });
    });
    
    if (!authCode) {
      console.log('❌ No authorization code provided. Exiting.');
      rl.close();
      return;
    }
    
    console.log('\n🔄 Step 2: Exchanging authorization code for access token...');
    
    // Step 3: Exchange code for token
    try {
      const tokenData = await practicePartnerService.exchangeCodeForToken(authCode, state);
      
      console.log('✅ Success! OAuth token obtained and stored.');
      console.log(`Token expires in: ${tokenData.expires_in} seconds`);
      console.log(`Has refresh token: ${tokenData.refresh_token ? 'Yes' : 'No'}`);
      
      // Step 4: Test the connection
      console.log('\n🧪 Step 3: Testing API connection...');
      const connectionTest = await practicePartnerService.testConnection();
      
      if (connectionTest.connected) {
        console.log('🎉 Perfect! PracticePanther API connection successful!');
        console.log('Sample data retrieved:', connectionTest.sampleData ? 'Yes' : 'No');
        
        console.log('\n✨ Setup complete! You can now:');
        console.log('• Run: node get-all-contacts.js');
        console.log('• Use the sync endpoints in your application');
        console.log('• Start the backend server and use the API');
      } else {
        console.log('⚠️ Token saved but API connection test failed');
        console.log('Message:', connectionTest.message);
      }
      
    } catch (tokenError) {
      console.error('❌ Failed to exchange authorization code:', tokenError.message);
      console.log('\n🔧 Troubleshooting:');
      console.log('• Make sure you copied the full authorization code');
      console.log('• Check that the redirect URI matches: https://localhost:8000');
      console.log('• Verify your PracticePanther app settings');
    }
    
  } catch (error) {
    console.error('❌ OAuth setup failed:', error.message);
  }
  
  rl.close();
}

console.log('🚀 Starting manual OAuth setup...\n');
manualOAuthSetup();