#!/usr/bin/env node

/**
 * Manual script to sync tasks from PracticePanther
 * Run with: node backend/scripts/sync-pp-tasks.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const PracticePartnerService = require('../services/practicePartnerService');

async function syncPPTasks() {
  console.log('🚀 Starting PracticePanther Task Sync...\n');
  
  const ppService = new PracticePartnerService();
  
  try {
    // First, ensure we have valid PP credentials
    const hasValidToken = await ppService.tokenManager.getValidAccessToken();
    if (!hasValidToken) {
      console.error('❌ No valid PracticePanther token available');
      console.log('Please ensure PP_CLIENT_ID and PP_CLIENT_SECRET are set in .env');
      process.exit(1);
    }
    
    console.log('✅ Valid PracticePanther token found\n');
    
    // Perform task sync
    console.log('📋 Syncing tasks from PracticePanther...');
    const result = await ppService.performIncrementalSync('tasks', 'manual-script');
    
    if (result.success) {
      console.log('\n✅ Task sync completed successfully!');
      console.log(`   - Records processed: ${result.recordsProcessed}`);
      console.log(`   - Records created: ${result.recordsCreated}`);
      console.log(`   - Records updated: ${result.recordsUpdated}`);
      if (result.errors?.length > 0) {
        console.log(`   - Errors: ${result.errors.length}`);
        result.errors.forEach(err => console.log(`     • ${err}`));
      }
    } else {
      console.error('\n❌ Task sync failed:', result.error);
    }
    
    // Show sample of synced tasks
    const { client } = require('../services/supabase');
    const { data: sampleTasks } = await client
      .from('tasks')
      .select('id, title, pp_task_id, exchange_id, status, assigned_to')
      .not('pp_task_id', 'is', null)
      .limit(5);
    
    if (sampleTasks?.length > 0) {
      console.log('\n📊 Sample of synced tasks:');
      sampleTasks.forEach(task => {
        console.log(`   - ${task.title}`);
        console.log(`     PP ID: ${task.pp_task_id}`);
        console.log(`     Exchange: ${task.exchange_id ? 'Linked' : 'Not linked'}`);
        console.log(`     Status: ${task.status}`);
        console.log(`     Assigned: ${task.assigned_to ? 'Yes' : 'No'}`);
      });
    }
    
    // Check overall stats
    const { data: stats } = await client
      .from('tasks')
      .select('pp_task_id, exchange_id')
      .then(result => {
        const ppTasks = result.data?.filter(t => t.pp_task_id) || [];
        const linkedTasks = result.data?.filter(t => t.exchange_id) || [];
        return {
          data: {
            total: result.data?.length || 0,
            fromPP: ppTasks.length,
            linkedToExchange: linkedTasks.length
          }
        };
      });
    
    console.log('\n📈 Overall Task Statistics:');
    console.log(`   Total tasks: ${stats.total}`);
    console.log(`   From PracticePanther: ${stats.fromPP}`);
    console.log(`   Linked to exchanges: ${stats.linkedToExchange}`);
    
  } catch (error) {
    console.error('❌ Error during sync:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the sync
syncPPTasks();