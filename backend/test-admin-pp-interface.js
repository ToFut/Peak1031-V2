#!/usr/bin/env node

/**
 * Test Admin PracticePanther Interface
 * Tests the new PP admin endpoints for token management and sync controls
 */

require('dotenv').config();
const axios = require('axios');

const API_BASE = 'http://localhost:5001/api';
const TEST_TOKEN = 'test-admin-token'; // This would normally be a valid JWT

async function testAdminPPInterface() {
  console.log('🧪 Testing Admin PracticePanther Interface\n');
  console.log('===============================================\n');

  try {
    // Test 1: Check PP Token Status
    console.log('📝 Test 1: Checking PP token status...');
    try {
      const statusResponse = await axios.get(`${API_BASE}/admin/pp-token/status`, {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` }
      });
      
      console.log('✅ Token Status Response:');
      console.log('   Status:', statusResponse.data.token_status?.status);
      console.log('   Message:', statusResponse.data.token_status?.message);
      console.log('   Has Refresh Token:', statusResponse.data.token_info?.has_refresh_token);
      
      if (statusResponse.data.last_refresh) {
        console.log('   Last Refresh:', statusResponse.data.last_refresh.time_since_refresh);
      }
      
      console.log('   Environment Check:');
      console.log('     - Client ID:', statusResponse.data.environment?.client_id_configured ? '✅' : '❌');
      console.log('     - Client Secret:', statusResponse.data.environment?.client_secret_configured ? '✅' : '❌');
      console.log('     - Supabase:', statusResponse.data.environment?.supabase_configured ? '✅' : '❌');
      
    } catch (error) {
      console.log('❌ Token status check failed:', error.response?.status || error.message);
    }

    // Test 2: Check Sync Status
    console.log('\n📝 Test 2: Checking sync status...');
    try {
      const syncResponse = await axios.get(`${API_BASE}/admin/pp-token/sync-status`, {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` }
      });
      
      console.log('✅ Sync Status Response:');
      console.log('   Sync Available:', syncResponse.data.sync_available);
      console.log('   Token Status:', syncResponse.data.token_status?.status);
      
      if (syncResponse.data.last_sync) {
        console.log('   Last Sync:', syncResponse.data.last_sync.time_since_sync);
        console.log('   Last Action:', syncResponse.data.last_sync.last_sync_action);
        console.log('   Recent Syncs:', syncResponse.data.last_sync.recent_syncs);
      } else {
        console.log('   Last Sync: No history found');
      }
      
    } catch (error) {
      console.log('❌ Sync status check failed:', error.response?.status || error.message);
    }

    // Test 3: Manual Token Refresh (if refresh token available)
    console.log('\n📝 Test 3: Testing manual token refresh...');
    try {
      const refreshResponse = await axios.post(`${API_BASE}/admin/pp-token/refresh`, {}, {
        headers: { 
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ Token refresh successful:');
      console.log('   Message:', refreshResponse.data.message);
      console.log('   New Expiry:', refreshResponse.data.expires_at);
      
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('⚠️ No stored token found - this is expected if OAuth not setup');
      } else if (error.response?.status === 400) {
        console.log('⚠️ Refresh failed - refresh token may be expired');
        console.log('   Error:', error.response?.data?.message);
      } else {
        console.log('❌ Token refresh failed:', error.response?.status || error.message);
      }
    }

    // Test 4: Test API Connection
    console.log('\n📝 Test 4: Testing PP API connection...');
    try {
      const testResponse = await axios.post(`${API_BASE}/admin/pp-token/test`, {}, {
        headers: { 
          Authorization: `Bearer ${TEST_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('✅ API connection test completed:');
      console.log('   Auth Test Status:', testResponse.data.auth_test?.status);
      console.log('   Auth Test Message:', testResponse.data.auth_test?.message);
      console.log('   API Test Success:', testResponse.data.api_test?.success);
      
      if (!testResponse.data.api_test?.success) {
        console.log('   API Test Error:', testResponse.data.api_test?.error);
      }
      
    } catch (error) {
      console.log('❌ API connection test failed:', error.response?.status || error.message);
    }

    // Test 5: Manual Sync Trigger (if token valid)
    console.log('\n📝 Test 5: Testing manual sync trigger...');
    try {
      const syncTriggerResponse = await axios.post(`${API_BASE}/admin/pp-token/trigger-sync`, 
        {
          sync_contacts: true,
          sync_matters: true,
          sync_tasks: true,
          force_full_sync: false
        },
        {
          headers: { 
            Authorization: `Bearer ${TEST_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('✅ Manual sync triggered successfully:');
      console.log('   Message:', syncTriggerResponse.data.message);
      console.log('   Sync Options:', syncTriggerResponse.data.sync_options);
      console.log('   Note:', syncTriggerResponse.data.note);
      
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('⚠️ Manual sync failed:');
        console.log('   Reason:', error.response?.data?.message);
        console.log('   Error:', error.response?.data?.error);
      } else {
        console.log('❌ Manual sync trigger failed:', error.response?.status || error.message);
      }
    }

    // Test 6: Get Auth URL (for setup)
    console.log('\n📝 Test 6: Getting OAuth setup URL...');
    try {
      const authUrlResponse = await axios.get(`${API_BASE}/admin/pp-token/auth-url`, {
        headers: { Authorization: `Bearer ${TEST_TOKEN}` },
        params: { redirect_uri: 'http://localhost:5001/api/admin/pp-token/callback' }
      });
      
      console.log('✅ OAuth setup URL generated:');
      console.log('   Auth URL:', authUrlResponse.data.auth_url.substring(0, 100) + '...');
      console.log('   Redirect URI:', authUrlResponse.data.redirect_uri);
      console.log('   Instructions:', authUrlResponse.data.instructions.length, 'steps provided');
      
    } catch (error) {
      console.log('❌ Auth URL generation failed:', error.response?.status || error.message);
    }

  } catch (error) {
    console.error('❌ Test setup error:', error.message);
  }

  console.log('\n===============================================');
  console.log('🎉 Admin PP Interface Test Complete!\n');
  
  console.log('📋 Available Admin Endpoints:');
  console.log('• GET /api/admin/pp-token/status - Detailed token status');
  console.log('• GET /api/admin/pp-token/sync-status - Sync history and status');
  console.log('• POST /api/admin/pp-token/refresh - Manual token refresh');
  console.log('• POST /api/admin/pp-token/test - Test API connection');
  console.log('• POST /api/admin/pp-token/trigger-sync - Manual sync trigger');
  console.log('• GET /api/admin/pp-token/auth-url - OAuth setup URL');
  console.log('• GET /api/admin/pp-token/callback - OAuth callback handler');
  console.log('• DELETE /api/admin/pp-token/revoke - Revoke tokens');
  
  console.log('\n🎨 Frontend Component:');
  console.log('• PPTokenManager component added to /admin/practice-panther');
  console.log('• Shows token status, last refresh, sync history');
  console.log('• Provides manual refresh and sync buttons');
  console.log('• Real-time status updates and error handling');
}

// Run the test
testAdminPPInterface().catch(console.error);