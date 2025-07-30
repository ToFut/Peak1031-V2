#!/usr/bin/env node

// Deep dive analysis of PracticePanther OAuth requirements
require('dotenv').config({ path: './backend/.env' });
const crypto = require('crypto');

console.log('🔍 DEEP DIVE: PracticePanther OAuth Analysis\n');

// Load configuration
const config = {
  clientId: process.env.PP_CLIENT_ID,
  clientSecret: process.env.PP_CLIENT_SECRET,
  redirectUri: process.env.PP_REDIRECT_URI
};

console.log('📋 ANALYSIS 1: Documentation Requirements Check');
console.log('='.repeat(50));

// 1. Check client_id format
console.log('1. CLIENT_ID VALIDATION:');
console.log(`   Value: ${config.clientId}`);
console.log(`   Length: ${config.clientId?.length || 0} characters`);
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
console.log(`   UUID Format: ${uuidRegex.test(config.clientId) ? '✅ Valid' : '❌ Invalid'}`);

// 2. Check redirect_uri requirements
console.log('\n2. REDIRECT_URI VALIDATION:');
console.log(`   Value: ${config.redirectUri}`);
console.log(`   Protocol: ${config.redirectUri?.startsWith('https://') ? '✅ HTTPS' : config.redirectUri?.startsWith('http://') ? '⚠️  HTTP (dev only)' : '❌ Invalid'}`);
console.log(`   Localhost: ${config.redirectUri?.includes('localhost') || config.redirectUri?.includes('127.0.0.1') ? '✅ Local development' : '❌ Not local'}`);

// 3. Documentation says specific URL paths
console.log('\n3. ENDPOINT URL ANALYSIS:');
const possibleEndpoints = [
  'https://app.practicepanther.com/oauth/authorize',     // lowercase (common)
  'https://app.practicepanther.com/OAuth/Authorize',    // mixed case (docs)
  'https://app.practicepanther.com/OAuth/authorize',    // mixed case variant
  'https://app.practicepanther.com/api/oauth/authorize', // with api prefix
  'https://api.practicepanther.com/oauth/authorize',    // api subdomain
];

console.log('   Possible authorization endpoints to test:');
possibleEndpoints.forEach((endpoint, i) => {
  console.log(`   ${i + 1}. ${endpoint}`);
});

console.log('\n📋 ANALYSIS 2: Parameter Requirements');
console.log('='.repeat(50));

// Generate state for testing
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

const testState = generateState();

// Required parameters according to docs
const requiredParams = {
  response_type: 'code',           // MUST be 'code'
  client_id: config.clientId,      // Your client_id
  redirect_uri: config.redirectUri, // MUST be registered
  state: testState                 // Recommended anti-forgery token
};

console.log('Required OAuth parameters:');
Object.entries(requiredParams).forEach(([key, value]) => {
  console.log(`   ${key}: ${value ? '✅' : '❌'} ${typeof value === 'string' && value.length > 50 ? value.substring(0, 50) + '...' : value}`);
});

console.log('\n📋 ANALYSIS 3: Common OAuth 400 Error Causes');
console.log('='.repeat(50));

const commonIssues = [
  {
    issue: 'Redirect URI not registered with PracticePanther',
    likelihood: 'HIGH',
    solution: 'Contact PracticePanther support to register redirect URI'
  },
  {
    issue: 'Client ID not approved for OAuth',
    likelihood: 'HIGH', 
    solution: 'Verify client_id is approved for OAuth access'
  },
  {
    issue: 'Wrong authorization endpoint URL',
    likelihood: 'MEDIUM',
    solution: 'Try different endpoint URL variations'
  },
  {
    issue: 'Missing required parameters',
    likelihood: 'LOW',
    solution: 'Ensure all required parameters are present'
  },
  {
    issue: 'Invalid parameter format',
    likelihood: 'LOW',
    solution: 'Check parameter encoding and format'
  }
];

commonIssues.forEach((item, i) => {
  console.log(`${i + 1}. ${item.issue}`);
  console.log(`   Likelihood: ${item.likelihood}`);
  console.log(`   Solution: ${item.solution}\n`);
});

console.log('📋 ANALYSIS 4: Test URLs Generation');
console.log('='.repeat(50));

// Generate test URLs for all endpoint variations
const redirectUriVariations = [
  config.redirectUri,
  'http://localhost:8000/oauth/callback',
  'https://localhost:8000/oauth/callback',
  'http://127.0.0.1:8000/oauth/callback',
  'https://127.0.0.1:8000/oauth/callback'
];

console.log('Generated test URLs:\n');

let urlCounter = 1;
possibleEndpoints.forEach(endpoint => {
  redirectUriVariations.forEach(redirectUri => {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: redirectUri,
      state: generateState()
    });
    
    const testUrl = `${endpoint}?${params.toString()}`;
    console.log(`${urlCounter}. ${endpoint.split('/').pop()} + ${redirectUri.split('//')[1]}`);
    console.log(`   ${testUrl}\n`);
    urlCounter++;
  });
});

console.log('📋 ANALYSIS 5: Debugging Steps');
console.log('='.repeat(50));

console.log('IMMEDIATE ACTIONS TO TRY:');
console.log('1. 🌐 Test URLs in order above');
console.log('2. 🔍 Check browser Network tab for exact error response');
console.log('3. 📧 Contact PracticePanther support immediately');
console.log('4. 🔑 Verify your OAuth app is approved');

console.log('\n📧 PRIORITY: Contact PracticePanther Support');
console.log('='.repeat(50));

console.log('EMAIL TEMPLATE:');
console.log('To: support@practicepanther.com');
console.log('Subject: URGENT: OAuth 400 Error - Need Redirect URI Registration');
console.log('');
console.log('Hi PracticePanther Team,');
console.log('');
console.log('I am experiencing a 400 error with your OAuth authorization endpoint and need immediate assistance.');
console.log('');
console.log('DETAILS:');
console.log(`- Client ID: ${config.clientId}`);
console.log(`- Redirect URI: ${config.redirectUri}`);
console.log('- Error: 400 Bad Request on /OAuth/Authorize endpoint');
console.log('- Issue: Unable to complete OAuth Step 1 - Authorization');
console.log('');
console.log('QUESTIONS:');
console.log('1. Is my redirect URI registered for this client_id?');
console.log('2. Is my client_id approved for OAuth access?');
console.log('3. What is the correct authorization endpoint URL?');
console.log('4. Are there any additional requirements I\'m missing?');
console.log('');
console.log('Please register these redirect URIs for my OAuth application:');
console.log('- Development: http://localhost:8000/oauth/callback');
console.log('- Development: https://localhost:8000/oauth/callback');
console.log('- Production: [Your production domain]/oauth/callback');
console.log('');
console.log('This is blocking our integration. Please prioritize this request.');
console.log('');
console.log('Thank you!');

console.log('\n🎯 RECOMMENDED FIRST TEST:');
console.log('='.repeat(50));

// Generate the most comprehensive test URL
const primaryTestUrl = `${possibleEndpoints[1]}?response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent('http://localhost:8000/oauth/callback')}&state=${generateState()}`;

console.log('Try this URL first (mixed case endpoint + http redirect):');
console.log(primaryTestUrl);

console.log('\n⚠️  CRITICAL: If this still fails, the issue is almost certainly:');
console.log('   1. Redirect URI not registered with PracticePanther (90% likely)');
console.log('   2. Client ID not approved for OAuth (10% likely)');
console.log('   3. Contact their support immediately!'); 