#!/usr/bin/env node

const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkSyncProcess() {
  console.log('🔍 Checking what happens during PP Sync...\n');
  
  try {
    // Login as admin first
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@test.com',
      password: 'admin123'
    });
    
    const adminToken = loginResponse.data.token;
    const headers = {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
    
    console.log('✅ Logged in as admin');
    
    // Check current sync status
    console.log('\n📊 BEFORE SYNC - Current Status:');
    const statusBefore = await axios.get('http://localhost:5001/api/admin/pp-token/sync-status', { headers });
    console.log('   Sync Available:', statusBefore.data.sync_available ? '✅' : '❌');
    console.log('   Service Active:', statusBefore.data.sync_service_active ? '✅' : '❌');
    if (statusBefore.data.last_sync) {
      console.log('   Last Sync:', statusBefore.data.last_sync.time_since_sync);
      console.log('   Last Action:', statusBefore.data.last_sync.last_sync_action);
    } else {
      console.log('   Last Sync: No history');
    }
    
    // Trigger sync and see what happens
    console.log('\n🚀 TRIGGERING SYNC NOW...');
    const syncResponse = await axios.post('http://localhost:5001/api/admin/pp-token/trigger-sync', {
      sync_contacts: true,
      sync_matters: true,
      sync_tasks: true,
      force_full_sync: false
    }, { headers });
    
    console.log('✅ Sync Response:');
    console.log('   Success:', syncResponse.data.success);
    console.log('   Message:', syncResponse.data.message);
    console.log('   Options:', JSON.stringify(syncResponse.data.sync_options, null, 2));
    console.log('   Note:', syncResponse.data.note);
    
    // Wait a moment then check what changed
    console.log('\n⏳ Waiting 5 seconds for sync to process...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n📊 AFTER SYNC - Updated Status:');
    const statusAfter = await axios.get('http://localhost:5001/api/admin/pp-token/sync-status', { headers });
    if (statusAfter.data.last_sync) {
      console.log('   Last Sync:', statusAfter.data.last_sync.time_since_sync);
      console.log('   Last Action:', statusAfter.data.last_sync.last_sync_action);
      console.log('   Recent Syncs:', statusAfter.data.last_sync.recent_syncs);
    }
    
    // Check audit logs to see what was logged
    console.log('\n📝 CHECKING AUDIT LOGS (Recent sync activities):');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('action, details, created_at')
      .ilike('action', '%sync%')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (logs && logs.length > 0) {
      console.log('   Recent sync activities:');
      logs.forEach(log => {
        const timeAgo = Math.floor((Date.now() - new Date(log.created_at).getTime()) / 1000);
        console.log(`   ${timeAgo}s ago: ${log.action}`);
        if (log.details) {
          const details = typeof log.details === 'object' ? log.details : {};
          if (details.total_synced !== undefined) {
            console.log(`     → Total synced: ${details.total_synced}`);
          }
          if (details.results) {
            console.log(`     → Results:`, JSON.stringify(details.results, null, 2));
          }
          if (details.triggered_by) {
            console.log(`     → Triggered by: ${details.triggered_by}`);
          }
        }
      });
    } else {
      console.log('   No sync logs found');
    }
    
    // Check what the sync actually does in the backend
    console.log('\n🔍 WHAT THE SYNC PROCESS DOES:');
    console.log('1. 📝 Logs PP_MANUAL_SYNC_STARTED to audit_logs');
    console.log('2. 🌐 Makes API calls to PracticePanther:');
    console.log('   - GET /contacts (limit 100)');
    console.log('   - GET /matters (limit 100)');
    console.log('   - GET /tasks (limit 100)');
    console.log('3. 💾 Processes and stores the data');
    console.log('4. 📝 Logs PP_MANUAL_SYNC_COMPLETED with results');
    console.log('5. ✅ Returns success status to admin interface');
    
    console.log('\n🎯 EXPECTED BEHAVIOR:');
    console.log('- Sync runs in background (non-blocking)');
    console.log('- Admin sees "Sync started" message immediately');
    console.log('- Data is fetched from PracticePanther API');
    console.log('- Results are logged to audit_logs table');
    console.log('- Sync status updates show completion');
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

checkSyncProcess();