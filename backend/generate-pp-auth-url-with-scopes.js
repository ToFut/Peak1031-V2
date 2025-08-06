require('dotenv').config({ path: '../.env' });

const PP_CLIENT_ID = process.env.PP_CLIENT_ID;
const PP_REDIRECT_URI = process.env.PP_REDIRECT_URI || 'https://localhost:8000';

console.log('🔗 GENERATING PRACTICEPANTHER AUTHORIZATION URL WITH SCOPES\n');

if (!PP_CLIENT_ID) {
  console.log('❌ PP_CLIENT_ID not found in .env file');
  process.exit(1);
}

// Generate a unique state parameter
const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Create the authorization URL with proper scopes
const authUrl = new URL('https://app.practicepanther.com/oauth/authorize');
authUrl.searchParams.set('client_id', PP_CLIENT_ID);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('redirect_uri', PP_REDIRECT_URI);
authUrl.searchParams.set('state', state);
authUrl.searchParams.set('scope', 'contacts matters tasks'); // Proper scopes for data access

console.log('📋 NEW AUTHORIZATION URL GENERATED:');
console.log('='.repeat(80));
console.log(authUrl.toString());
console.log('='.repeat(80));

console.log('\n📋 INSTRUCTIONS:');
console.log('='.repeat(80));
console.log('1. Copy the URL above and paste it in your browser');
console.log('2. Log in to PracticePanther if prompted');
console.log('3. Grant the requested permissions (contacts, matters, tasks)');
console.log('4. You will be redirected to a URL with a "code" parameter');
console.log('5. Copy the entire code value from the URL');
console.log('6. Update your .env file with the new PP_AUTH_CODE');
console.log('7. Run: node quick-pp-setup.js');
console.log('');

console.log('🔍 REQUIRED SCOPES:');
console.log('✅ contacts - Access to all contacts (11,173)');
console.log('✅ matters - Access to all matters/exchanges (7,148)');
console.log('✅ tasks - Access to all tasks');
console.log('');

console.log('⚠️  IMPORTANT:');
console.log('- The authorization code expires in 10 minutes');
console.log('- Make sure to complete the process quickly');
console.log('- The new token will have proper permissions');
console.log('');

console.log('🚀 After getting the new code, run:');
console.log('node quick-pp-setup.js'); 