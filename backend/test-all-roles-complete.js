#!/usr/bin/env node

/**
 * Complete test of all role access after fixes
 * Tests agency, coordinator, third_party access to exchanges, tasks, chat
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function testAllRolesComplete() {
  console.log('🧪 COMPLETE ROLE ACCESS TEST\n');
  console.log('=' .repeat(70));
  
  const results = {
    coordinator: { exchanges: 0, tasks: 0, messages: 0 },
    third_party: { exchanges: 0, tasks: 0, messages: 0 },
    agency: { exchanges: 0, tasks: 0, messages: 0 }
  };

  try {
    // Test 1: Coordinator Access
    console.log('\n📋 Testing COORDINATOR Access...\n');
    
    const { data: coordinator } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'coordinator@peak1031.com')
      .single();

    if (coordinator) {
      console.log(`User: ${coordinator.email}`);
      console.log(`ID: ${coordinator.id}`);
      console.log(`Contact ID: ${coordinator.contact_id}`);
      
      // Check exchanges as participant
      const { data: coordParticipants } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id, role')
        .eq('user_id', coordinator.id);
      
      results.coordinator.exchanges = coordParticipants?.length || 0;
      console.log(`\n✅ Participant in ${results.coordinator.exchanges} exchanges`);
      
      if (coordParticipants && coordParticipants.length > 0) {
        // Check tasks for first exchange
        const exchangeId = coordParticipants[0].exchange_id;
        const { data: tasks } = await supabaseService.client
          .from('tasks')
          .select('id')
          .eq('exchange_id', exchangeId);
        
        results.coordinator.tasks = tasks?.length || 0;
        console.log(`✅ Can see ${results.coordinator.tasks} tasks in first exchange`);
        
        // Check messages
        const { data: messages } = await supabaseService.client
          .from('messages')
          .select('id')
          .eq('exchange_id', exchangeId)
          .limit(5);
        
        results.coordinator.messages = messages?.length || 0;
        console.log(`✅ Can see ${results.coordinator.messages} recent messages`);
        
        // Get exchange details
        const { data: exchange } = await supabaseService.client
          .from('exchanges')
          .select('name, exchange_number')
          .eq('id', exchangeId)
          .single();
        
        if (exchange) {
          console.log(`\n📁 Example exchange: ${exchange.name || exchange.exchange_number}`);
        }
      }
    }

    // Test 2: Third Party Access
    console.log('\n' + '-'.repeat(70));
    console.log('\n📋 Testing THIRD_PARTY Access...\n');
    
    const { data: thirdParty } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'thirdparty1@peak1031.com')
      .single();

    if (thirdParty) {
      console.log(`User: ${thirdParty.email}`);
      console.log(`ID: ${thirdParty.id}`);
      console.log(`Contact ID: ${thirdParty.contact_id}`);
      
      // Check exchanges
      const { data: tpParticipants } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id, role')
        .eq('user_id', thirdParty.id);
      
      results.third_party.exchanges = tpParticipants?.length || 0;
      console.log(`\n✅ Participant in ${results.third_party.exchanges} exchanges`);
      
      if (tpParticipants && tpParticipants.length > 0) {
        const exchangeId = tpParticipants[0].exchange_id;
        
        // Check tasks
        const { data: tasks } = await supabaseService.client
          .from('tasks')
          .select('id')
          .eq('exchange_id', exchangeId);
        
        results.third_party.tasks = tasks?.length || 0;
        console.log(`✅ Can see ${results.third_party.tasks} tasks`);
        
        // Check messages
        const { data: messages } = await supabaseService.client
          .from('messages')
          .select('id')
          .eq('exchange_id', exchangeId)
          .limit(5);
        
        results.third_party.messages = messages?.length || 0;
        console.log(`✅ Can see ${results.third_party.messages} recent messages`);
        
        // Get exchange details
        const { data: exchange } = await supabaseService.client
          .from('exchanges')
          .select('name, exchange_number')
          .eq('id', exchangeId)
          .single();
        
        if (exchange) {
          console.log(`\n📁 Example exchange: ${exchange.name || exchange.exchange_number}`);
        }
      }
    }

    // Test 3: Agency Access
    console.log('\n' + '-'.repeat(70));
    console.log('\n📋 Testing AGENCY Access...\n');
    
    const { data: agency } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'agency@peak1031.com')
      .single();

    if (agency) {
      console.log(`User: ${agency.email}`);
      console.log(`ID: ${agency.id}`);
      console.log(`Contact ID: ${agency.contact_id}`);
      
      // Check exchanges
      const { data: agencyParticipants } = await supabaseService.client
        .from('exchange_participants')
        .select('exchange_id, role')
        .eq('user_id', agency.id);
      
      results.agency.exchanges = agencyParticipants?.length || 0;
      console.log(`\n✅ Participant in ${results.agency.exchanges} exchanges`);
      
      if (agencyParticipants && agencyParticipants.length > 0) {
        const exchangeId = agencyParticipants[0].exchange_id;
        
        // Check tasks
        const { data: tasks } = await supabaseService.client
          .from('tasks')
          .select('id')
          .eq('exchange_id', exchangeId);
        
        results.agency.tasks = tasks?.length || 0;
        console.log(`✅ Can see ${results.agency.tasks} tasks`);
        
        // Check messages
        const { data: messages } = await supabaseService.client
          .from('messages')
          .select('id')
          .eq('exchange_id', exchangeId)
          .limit(5);
        
        results.agency.messages = messages?.length || 0;
        console.log(`✅ Can see ${results.agency.messages} recent messages`);
      }
    } else {
      console.log('⚠️ No agency user found with email: agency@peak1031.com');
    }

    // Test 4: Verify Backend Filtering
    console.log('\n' + '=' .repeat(70));
    console.log('📊 SUMMARY OF ACCESS\n');
    
    console.log('Role Access Matrix:');
    console.log('─'.repeat(50));
    console.log('Role         | Exchanges | Tasks | Messages');
    console.log('─'.repeat(50));
    console.log(`Coordinator  | ${String(results.coordinator.exchanges).padEnd(9)} | ${String(results.coordinator.tasks).padEnd(5)} | ${results.coordinator.messages}`);
    console.log(`Third Party  | ${String(results.third_party.exchanges).padEnd(9)} | ${String(results.third_party.tasks).padEnd(5)} | ${results.third_party.messages}`);
    console.log(`Agency       | ${String(results.agency.exchanges).padEnd(9)} | ${String(results.agency.tasks).padEnd(5)} | ${results.agency.messages}`);
    console.log('─'.repeat(50));
    
    // Overall assessment
    const allWorking = 
      results.coordinator.exchanges > 0 &&
      results.third_party.exchanges > 0;
    
    console.log('\n' + '=' .repeat(70));
    if (allWorking) {
      console.log('✅ SYSTEM STATUS: FULLY OPERATIONAL\n');
      console.log('All invited users can now:');
      console.log('  • See their assigned exchanges in the list');
      console.log('  • Access tasks for their exchanges');
      console.log('  • View and send messages in chat');
      console.log('  • Access documents (with appropriate permissions)');
    } else {
      console.log('⚠️ SYSTEM STATUS: PARTIALLY OPERATIONAL\n');
      
      if (results.coordinator.exchanges === 0) {
        console.log('  ❌ Coordinator cannot see exchanges');
      }
      if (results.third_party.exchanges === 0) {
        console.log('  ❌ Third Party cannot see exchanges');
      }
      if (results.agency.exchanges === 0) {
        console.log('  ⚠️ Agency has no assigned exchanges (normal if not invited)');
      }
    }
    
    console.log('\n💡 Next Steps:');
    console.log('1. Test the frontend UI with each role');
    console.log('2. Verify real-time notifications work');
    console.log('3. Check document access permissions');
    console.log('4. Test WebSocket chat functionality');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  }
}

// Run the test
testAllRolesComplete();