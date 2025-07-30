#!/usr/bin/env node

// Debug script to analyze OAuth URL and identify potential 400 error causes

const generatedUrl = "https://app.practicepanther.com/oauth/authorize?response_type=code&client_id=c1ba43b4-155b-4a69-90cb-55cf7f1e7f41&redirect_uri=http%3A%2F%2Flocalhost%3A8000%2Foauth%2Fcallback&state=094fdaf78c5e56c17098e546c26e4d7f92da9af26d7d7c7a92f12fb10ebb393d";

console.log('🔍 OAuth URL Debug Analysis\n');

// Parse the URL
const url = new URL(generatedUrl);
console.log('📋 Base URL:', url.origin + url.pathname);
console.log('📋 Parameters:');

// Extract and decode parameters
const params = {};
url.searchParams.forEach((value, key) => {
  params[key] = value;
  console.log(`   ${key}: ${value}`);
});

console.log('\n🔍 Parameter Analysis:');

// Check response_type
if (params.response_type !== 'code') {
  console.log('❌ ERROR: response_type should be "code"');
} else {
  console.log('✅ response_type: Valid');
}

// Check client_id format (should be UUID)
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!uuidRegex.test(params.client_id)) {
  console.log('❌ ERROR: client_id format invalid (should be UUID)');
} else {
  console.log('✅ client_id: Valid UUID format');
}

// Check redirect_uri
const decodedRedirectUri = decodeURIComponent(params.redirect_uri);
console.log(`✅ redirect_uri (decoded): ${decodedRedirectUri}`);

// Check if redirect_uri is HTTP (not HTTPS) - this might be an issue
if (decodedRedirectUri.startsWith('http://')) {
  console.log('⚠️  WARNING: redirect_uri uses HTTP (not HTTPS)');
  console.log('   PracticePanther might require HTTPS for production');
} else {
  console.log('✅ redirect_uri: Uses HTTPS');
}

// Check state parameter
if (!params.state || params.state.length < 10) {
  console.log('❌ ERROR: state parameter too short or missing');
} else {
  console.log('✅ state: Valid length');
}

console.log('\n🚀 Potential Issues and Solutions:');

if (decodedRedirectUri.startsWith('http://')) {
  console.log('1. ⚠️  HTTP Redirect URI Issue:');
  console.log('   - Your redirect_uri uses HTTP instead of HTTPS');
  console.log('   - PracticePanther might require HTTPS for security');
  console.log('   - Try using: https://localhost:8000/oauth/callback');
  console.log('   - Or use your production domain with HTTPS\n');
}

console.log('2. 🔧 Alternative Redirect URIs to try:');
console.log('   - https://localhost:8000/oauth/callback');
console.log('   - http://127.0.0.1:8000/oauth/callback');
console.log('   - Your production domain with HTTPS');

console.log('\n3. 📋 Debug Steps:');
console.log('   1. Check if redirect_uri is registered with PracticePanther');
console.log('   2. Try HTTPS instead of HTTP');
console.log('   3. Verify client_id is correct in PracticePanther dashboard');
console.log('   4. Check browser network tab for detailed error message');

console.log('\n4. 🌐 Test URLs:');
console.log('\n   With HTTPS:');
const httpsUrl = generatedUrl.replace('http%3A%2F%2F', 'https%3A%2F%2F');
console.log(`   ${httpsUrl}`);

console.log('\n   With 127.0.0.1:');
const localhostUrl = generatedUrl.replace('http%3A%2F%2Flocalhost%3A8000', 'http%3A%2F%2F127.0.0.1%3A8000');
console.log(`   ${localhostUrl}`); 