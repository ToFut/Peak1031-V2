#!/usr/bin/env node

require('dotenv').config();

const clientId = process.env.PP_CLIENT_ID;
const redirectUri = process.env.PP_REDIRECT_URI || 'https://localhost:8000';
const state = Math.random().toString(36).substring(2, 15);

console.log('🔗 Testing different PracticePanther OAuth URL formats:\n');

// Try different URL patterns
const urlPatterns = [
  // Pattern 1: OAuth with capital O
  `https://app.practicepanther.com/OAuth/Authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
  
  // Pattern 2: oauth lowercase
  `https://app.practicepanther.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
  
  // Pattern 3: API v2 endpoint
  `https://app.practicepanther.com/api/v2/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`,
  
  // Pattern 4: Without encoded redirect URI
  `https://app.practicepanther.com/OAuth/Authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&state=${state}`,
  
  // Pattern 5: With scope parameter
  `https://app.practicepanther.com/OAuth/Authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=contacts%20matters%20tasks&state=${state}`
];

console.log('Try each URL in your browser to see which one works:\n');

urlPatterns.forEach((url, index) => {
  console.log(`Option ${index + 1}:`);
  console.log(url);
  console.log('');
});

console.log('📝 Current Configuration:');
console.log(`Client ID: ${clientId}`);
console.log(`Redirect URI: ${redirectUri}`);
console.log(`State: ${state}`);

console.log('\n💡 If none work, try:');
console.log('1. Check if the redirect URI matches exactly what\'s configured in PP');
console.log('2. Try http://localhost:8000 instead of https://localhost:8000');
console.log('3. Check PracticePanther\'s OAuth documentation');
console.log('4. Verify the client ID is correct in their system');