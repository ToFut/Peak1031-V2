#!/usr/bin/env node

/**
 * Test why client role works but others don't
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function testRoleFiltering() {
  console.log('🔍 Testing Role Filtering Logic\n');
  console.log('=' .repeat(70));
  
  try {
    // Test 1: Client user
    console.log('\n📋 Test 1: CLIENT Role\n');
    
    const { data: clientUser } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'client@peak1031.com')
      .single();

    if (clientUser) {
      console.log(`User: ${clientUser.email}`);
      console.log(`Contact ID: ${clientUser.contact_id}`);
      
      // Check participants by contact_id
      const { data: participants } = await supabaseService.client
        .from('exchange_participants')
        .select('*')
        .eq('contact_id', clientUser.contact_id);
      
      console.log(`\nAs participant (by contact_id): ${participants?.length || 0} exchanges`);
      
      // Check exchanges where they're the primary client
      const { data: primaryClient } = await supabaseService.client
        .from('exchanges')
        .select('id, name, exchange_number')
        .eq('client_id', clientUser.contact_id)
        .limit(5);
      
      console.log(`As primary client: ${primaryClient?.length || 0} exchanges`);
      
      if (primaryClient && primaryClient.length > 0) {
        console.log('\nExamples as primary client:');
        primaryClient.forEach(ex => {
          console.log(`  - ${ex.name || ex.exchange_number}`);
        });
      }
    }
    
    // Test 2: Coordinator user
    console.log('\n' + '-'.repeat(70));
    console.log('\n📋 Test 2: COORDINATOR Role\n');
    
    const { data: coordUser } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'coordinator@peak1031.com')
      .single();

    if (coordUser) {
      console.log(`User: ${coordUser.email}`);
      console.log(`User ID: ${coordUser.id}`);
      console.log(`Contact ID: ${coordUser.contact_id}`);
      
      // Check BOTH user_id and contact_id (as per our fix)
      const { data: participantsByUser } = await supabaseService.client
        .from('exchange_participants')
        .select('*')
        .eq('user_id', coordUser.id);
      
      const { data: participantsByContact } = coordUser.contact_id ? 
        await supabaseService.client
          .from('exchange_participants')
          .select('*')
          .eq('contact_id', coordUser.contact_id) : { data: [] };
      
      // Combine and dedupe
      const allParticipants = [...(participantsByUser || []), ...(participantsByContact || [])];
      const uniqueExchangeIds = [...new Set(allParticipants.map(p => p.exchange_id))];
      const participants = allParticipants;
      
      console.log(`\nAs participant (user_id OR contact_id): ${participants.length} exchanges`);
      
      if (participants.length > 0) {
        const exchangeIds = [...new Set(participants.map(p => p.exchange_id))];
        console.log(`Unique exchange IDs: ${exchangeIds.length}`);
        
        // Get exchange details
        const { data: exchanges } = await supabaseService.client
          .from('exchanges')
          .select('id, name, exchange_number')
          .in('id', exchangeIds);
        
        if (exchanges && exchanges.length > 0) {
          console.log('\nExamples:');
          exchanges.slice(0, 3).forEach(ex => {
            console.log(`  - ${ex.name || ex.exchange_number}`);
          });
        }
      }
      
      // Check as primary coordinator
      const { data: primaryCoord } = await supabaseService.client
        .from('exchanges')
        .select('id, name')
        .eq('coordinator_id', coordUser.id);
      
      console.log(`\nAs primary coordinator: ${primaryCoord?.length || 0} exchanges`);
    }
    
    // Test 3: Agency user
    console.log('\n' + '-'.repeat(70));
    console.log('\n📋 Test 3: AGENCY Role\n');
    
    const { data: agencyUser } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'agency@peak1031.com')
      .single();

    if (agencyUser) {
      console.log(`User: ${agencyUser.email}`);
      console.log(`User ID: ${agencyUser.id}`);
      console.log(`Contact ID: ${agencyUser.contact_id}`);
      
      // Check BOTH user_id and contact_id (as per our fix)
      const { data: participantsByUser } = await supabaseService.client
        .from('exchange_participants')
        .select('*')
        .eq('user_id', agencyUser.id);
      
      const { data: participantsByContact } = agencyUser.contact_id ? 
        await supabaseService.client
          .from('exchange_participants')
          .select('*')
          .eq('contact_id', agencyUser.contact_id) : { data: [] };
      
      const participants = [...(participantsByUser || []), ...(participantsByContact || [])];
      
      console.log(`\nAs participant (user_id OR contact_id): ${participants.length} exchanges`);
      
      if (participants.length > 0) {
        console.log('\nParticipant records:');
        participants.slice(0, 3).forEach(p => {
          console.log(`  - Exchange: ${p.exchange_id.substring(0, 8)}...`);
          console.log(`    Role: ${p.role}, User ID: ${p.user_id ? '✅' : '❌'}`);
        });
      }
    }
    
    // Test 4: Third Party user
    console.log('\n' + '-'.repeat(70));
    console.log('\n📋 Test 4: THIRD_PARTY Role\n');
    
    const { data: tpUser } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'thirdparty1@peak1031.com')
      .single();

    if (tpUser) {
      console.log(`User: ${tpUser.email}`);
      console.log(`User ID: ${tpUser.id}`);
      console.log(`Contact ID: ${tpUser.contact_id}`);
      
      // Check BOTH user_id and contact_id
      const { data: participantsByUser } = await supabaseService.client
        .from('exchange_participants')
        .select('*')
        .eq('user_id', tpUser.id);
      
      const { data: participantsByContact } = tpUser.contact_id ? 
        await supabaseService.client
          .from('exchange_participants')
          .select('*')
          .eq('contact_id', tpUser.contact_id) : { data: [] };
      
      const participants = [...(participantsByUser || []), ...(participantsByContact || [])];
      
      console.log(`\nAs participant (user_id OR contact_id): ${participants.length} exchanges`);
    }
    
    // Summary
    console.log('\n' + '=' .repeat(70));
    console.log('📊 ANALYSIS\n');
    
    console.log('Key Findings:');
    console.log('1. Client role works because it checks BOTH:');
    console.log('   - Participants table (by contact_id)');
    console.log('   - Direct client_id field on exchanges table');
    console.log('\n2. Other roles only check participants table');
    console.log('   - Need user_id to be set in participants');
    console.log('   - Our fix added user_id checking');
    console.log('\n3. Make sure backend is using the updated filtering logic');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testRoleFiltering();