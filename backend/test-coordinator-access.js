#!/usr/bin/env node

/**
 * Test coordinator access to exchanges after invitation
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function testCoordinatorAccess() {
  console.log('🔍 Testing Coordinator Exchange Access\n');
  
  try {
    // Find a coordinator
    const { data: coordinators } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('role', 'coordinator')
      .eq('email', 'coordinator@peak1031.com')
      .single();

    if (!coordinators) {
      console.log('❌ Coordinator coordinator@peak1031.com not found');
      return;
    }

    const coordinator = coordinators;
    console.log(`✅ Found coordinator: ${coordinator.email}`);
    console.log(`   ID: ${coordinator.id}`);
    console.log(`   Contact ID: ${coordinator.contact_id || 'None'}`);

    // Check participant records
    console.log('\n📋 Checking participant records:');
    
    // By user_id
    const { data: byUserId } = await supabaseService.client
      .from('exchange_participants')
      .select('exchange_id, role, user_id, contact_id, is_active')
      .eq('user_id', coordinator.id);

    console.log(`\n✅ Found ${byUserId?.length || 0} participant records by user_id`);
    
    if (byUserId && byUserId.length > 0) {
      console.log('\nParticipant records with user_id:');
      byUserId.forEach(p => {
        console.log(`  - Exchange: ${p.exchange_id}`);
        console.log(`    Role: ${p.role}, Active: ${p.is_active}`);
        console.log(`    user_id: ${p.user_id ? '✅' : '❌ MISSING'}`);
        console.log(`    contact_id: ${p.contact_id || 'None'}`);
      });
    }

    // By contact_id if available
    if (coordinator.contact_id) {
      const { data: byContactId } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id, role, user_id, contact_id')
        .eq('contact_id', coordinator.contact_id);

      console.log(`\n✅ Found ${byContactId?.length || 0} participant records by contact_id`);
    }

    // Get exchange details
    if (byUserId && byUserId.length > 0) {
      const exchangeIds = [...new Set(byUserId.map(p => p.exchange_id))];
      const { data: exchanges } = await supabaseService.client
        .from('exchanges')
        .select('id, exchange_number, name, status')
        .in('id', exchangeIds);

      console.log(`\n📁 Exchanges coordinator should see (${exchanges?.length || 0}):`);
      if (exchanges) {
        exchanges.forEach(ex => {
          console.log(`  - ${ex.name || ex.exchange_number} (Status: ${ex.status})`);
        });
      }
    }

    // Check as primary coordinator
    const { data: primaryExchanges } = await supabaseService.client
      .from('exchanges')
      .select('id, exchange_number, name')
      .eq('coordinator_id', coordinator.id);

    if (primaryExchanges && primaryExchanges.length > 0) {
      console.log(`\n📁 Primary coordinator for ${primaryExchanges.length} exchanges:`);
      primaryExchanges.forEach(ex => {
        console.log(`  - ${ex.name || ex.exchange_number}`);
      });
    }

    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('SUMMARY:');
    
    const totalExchanges = (byUserId?.length || 0) + (primaryExchanges?.length || 0);
    if (totalExchanges > 0) {
      console.log(`✅ Coordinator has access to ${totalExchanges} exchange(s)`);
      
      // Check for missing user_id
      if (byUserId) {
        const missingUserId = byUserId.filter(p => !p.user_id);
        if (missingUserId.length > 0) {
          console.log(`\n⚠️ WARNING: ${missingUserId.length} participant record(s) missing user_id`);
          console.log('These records won\'t be found by the coordinator filter!');
        }
      }
    } else {
      console.log('⚠️ Coordinator has no exchange access');
      console.log('\nPossible reasons:');
      console.log('  1. Not assigned as primary coordinator to any exchanges');
      console.log('  2. Not added as participant to any exchanges');
      console.log('  3. Participant records missing user_id field');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testCoordinatorAccess();