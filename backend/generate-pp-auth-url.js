#!/usr/bin/env node

require('dotenv').config({ path: '../.env' });

const PP_CLIENT_ID = process.env.PP_CLIENT_ID;
const PP_REDIRECT_URI = process.env.PP_REDIRECT_URI || 'https://localhost:8000';

console.log('🔗 GENERATING PRACTICEPANTHER AUTHORIZATION URL\n');

if (!PP_CLIENT_ID) {
  console.log('❌ PP_CLIENT_ID not found in .env file');
  process.exit(1);
}

// Generate a random state parameter for security
const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Build the authorization URL
const authUrl = new URL('https://app.practicepanther.com/oauth/authorize');
authUrl.searchParams.set('client_id', PP_CLIENT_ID);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('redirect_uri', PP_REDIRECT_URI);
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('scope', 'contacts matters tasks'); // Request access to contacts, matters, and tasks
authUrl.searchParams.set('isLogin', 'True'); // Required parameter for PP OAuth

console.log('📋 Authorization URL Generated:');
console.log('='.repeat(80));
console.log(authUrl.toString());
console.log('='.repeat(80));

console.log('\n📝 Instructions:');
console.log('1. Copy the URL above and paste it in your browser');
console.log('2. Log in to your PracticePanther account');
console.log('3. Grant permission to the application');
console.log('4. You will be redirected to a URL like:');
console.log(`   ${PP_REDIRECT_URI}?code=AUTH_CODE_HERE&state=${state}`);
console.log('5. Copy the "code" parameter value (everything after "code=" and before "&state")');
console.log('6. Add it to your .env file as: PP_AUTH_CODE=your_code_here');
console.log('\n⚠️  Note: Auth codes expire quickly, so do this step right before running the setup script');

console.log('\n🔐 Security State Parameter:', state);
console.log('   (Save this to verify the response matches)');