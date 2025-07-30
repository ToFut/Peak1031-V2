#!/usr/bin/env node

/**
 * Test script for PracticePanther integration
 * Run this to test the PP API connection directly
 */

require('dotenv').config();

const practicePartnerService = require('./services/practicePartnerService');

async function testPPConnection() {
  console.log('🔗 Testing PracticePanther API Connection...\n');
  
  try {
    // Test the connection
    console.log('Environment variables check:');
    console.log('PP_CLIENT_ID:', process.env.PP_CLIENT_ID ? '✅ Set' : '❌ Missing');
    console.log('PP_CLIENT_SECRET:', process.env.PP_CLIENT_SECRET ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
    console.log('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
    console.log('');
    
    console.log('🔍 Credentials being used:');
    console.log('PP_CLIENT_ID:', process.env.PP_CLIENT_ID);
    console.log('PP_CLIENT_SECRET:', process.env.PP_CLIENT_SECRET);
    console.log('');

    if (!process.env.PP_CLIENT_ID || !process.env.PP_CLIENT_SECRET) {
      throw new Error('PracticePanther credentials not configured');
    }

    // Test PP connection
    console.log('Testing PracticePanther API connection...');
    const connectionResult = await practicePartnerService.testConnection();
    
    console.log('🎉 Connection Test Results:');
    console.log('Connected:', connectionResult.connected ? '✅ Yes' : '❌ No');
    console.log('Message:', connectionResult.message);
    
    if (connectionResult.sampleData) {
      console.log('Sample Data Retrieved:', connectionResult.sampleData.length, 'records');
      if (connectionResult.sampleData.length > 0) {
        console.log('First record keys:', Object.keys(connectionResult.sampleData[0]));
      }
    }

    // Test authentication separately
    console.log('\n🔐 Testing OAuth Authentication...');
    const authResult = await practicePartnerService.authenticate();
    console.log('Auth Token:', authResult.access_token ? '✅ Obtained' : '❌ Failed');
    console.log('Token Type:', authResult.token_type);
    console.log('Expires In:', authResult.expires_in, 'seconds');

  } catch (error) {
    console.error('❌ Connection Test Failed:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    
    // Additional debugging
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('HTTP Data:', error.response.data);
    }
  }
}

// Run the test
if (require.main === module) {
  testPPConnection().then(() => {
    console.log('\n✅ Test completed');
    process.exit(0);
  }).catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
}

module.exports = testPPConnection;