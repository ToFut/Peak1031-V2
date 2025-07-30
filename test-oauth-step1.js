#!/usr/bin/env node

// Test script for OAuth Step 1 - Authorization URL Generation
// This demonstrates how to build the authorization URL for PracticePanther OAuth

require('dotenv').config({ path: './backend/.env' });
const crypto = require('crypto');

console.log('🔐 PracticePanther OAuth Step 1 - Authorization URL Generation\n');

// Debug: Show what environment variables are loaded
console.log('🔍 Debug - Environment Variables from backend/.env:');
console.log(`   PP_CLIENT_ID: ${process.env.PP_CLIENT_ID || 'NOT FOUND'}`);
console.log(`   PP_CLIENT_SECRET: ${process.env.PP_CLIENT_SECRET || 'NOT FOUND'}`);
console.log(`   PP_REDIRECT_URI: ${process.env.PP_REDIRECT_URI || 'NOT FOUND'}\n`);

// OAuth Configuration from environment variables (backend format)
const config = {
  clientId: process.env.PP_CLIENT_ID || 'your_client_id_here',
  clientSecret: process.env.PP_CLIENT_SECRET || 'your_client_secret_here',
  redirectUri: process.env.PP_REDIRECT_URI || 'http://localhost:8000/oauth/callback',
  authorizationUrl: 'https://app.practicepanther.com/oauth/authorize'
};

// Generate a random state parameter for CSRF protection
function generateState() {
  return crypto.randomBytes(32).toString('hex');
}

// Build the authorization URL
function buildAuthorizationUrl() {
  const state = generateState();
  
  const params = new URLSearchParams({
    response_type: 'code',           // Always 'code' for authorization code flow
    client_id: config.clientId,      // Your application's client ID
    redirect_uri: config.redirectUri, // Where PracticePanther will redirect back
    state: state                     // Random string for CSRF protection
  });

  const authUrl = `${config.authorizationUrl}?${params.toString()}`;
  
  return { authUrl, state };
}

// Main demonstration
function demonstrateOAuthStep1() {
  console.log('📋 OAuth Configuration:');
  console.log(`   Client ID: ${config.clientId}`);
  console.log(`   Client Secret: ${config.clientSecret ? config.clientSecret.substring(0, 10) + '...' : 'NOT SET'}`);
  console.log(`   Redirect URI: ${config.redirectUri}`);
  console.log(`   Authorization URL: ${config.authorizationUrl}\n`);

  // Check if we have real credentials
  const hasRealCredentials = config.clientId !== 'your_client_id_here' && 
                            config.clientSecret !== 'your_client_secret_here' &&
                            config.clientId && config.clientSecret;

  if (!hasRealCredentials) {
    console.log('⚠️  WARNING: Using placeholder credentials!');
    console.log('   Please set PP_CLIENT_ID and PP_CLIENT_SECRET in backend/.env\n');
  } else {
    console.log('✅ Using real PracticePanther credentials from backend/.env\n');
  }

  console.log('🔗 Generating Authorization URL...\n');
  
  const { authUrl, state } = buildAuthorizationUrl();
  
  console.log('✅ Generated Authorization URL:');
  console.log(`${authUrl}\n`);
  
  console.log('🔒 Security Details:');
  console.log(`   State Parameter: ${state}`);
  console.log(`   State Purpose: CSRF protection (store this and verify on callback)\n`);
  
  console.log('📝 URL Parameters Breakdown:');
  console.log(`   response_type: code (requesting authorization code)`);
  console.log(`   client_id: ${config.clientId}`);
  console.log(`   redirect_uri: ${config.redirectUri}`);
  console.log(`   state: ${state}\n`);
  
  console.log('🚀 Next Steps:');
  if (hasRealCredentials) {
    console.log('   1. User clicks this URL to authorize your app');
    console.log('   2. User is redirected to PracticePanther to login and grant permission');
    console.log('   3. PracticePanther redirects back to your redirect_uri with:');
    console.log(`      ${config.redirectUri}?code=AUTHORIZATION_CODE&state=${state}`);
    console.log('   4. Exchange the authorization code for access tokens (Step 2)\n');
    
    console.log('🌐 Test the URL:');
    console.log('   Copy the authorization URL above and paste it in your browser');
    console.log('   This will start the OAuth flow with PracticePanther\n');
    
    console.log('📋 For React Frontend Integration:');
    console.log('   Add these to frontend/.env:');
    console.log(`   REACT_APP_PP_CLIENT_ID=${config.clientId}`);
    console.log(`   REACT_APP_PP_CLIENT_SECRET=${config.clientSecret}`);
    console.log(`   REACT_APP_PP_REDIRECT_URI=${config.redirectUri}`);
  } else {
    console.log('   1. Set real credentials in backend/.env file');
    console.log('   2. Run this script again');
    console.log('   3. Then test the generated URL\n');
  }
}

// Run the demonstration
demonstrateOAuthStep1(); 