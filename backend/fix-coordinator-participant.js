#!/usr/bin/env node

/**
 * Fix the coordinator participant record to include user_id
 */

require('dotenv').config();
const supabaseService = require('./services/supabase');

async function fixCoordinatorParticipant() {
  console.log('🔧 Fixing coordinator participant record\n');
  
  try {
    // Find the coordinator user
    const { data: coordinator } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'coordinator@peak1031.com')
      .single();

    if (!coordinator) {
      console.log('❌ Coordinator not found');
      return;
    }

    console.log(`✅ Found coordinator:`);
    console.log(`   Email: ${coordinator.email}`);
    console.log(`   User ID: ${coordinator.id}`);
    console.log(`   Contact ID: ${coordinator.contact_id}`);

    // Find participant records with this contact_id but no user_id
    const { data: participants } = await supabaseService.client
      .from('exchange_participants')
      .select('*')
      .eq('contact_id', coordinator.contact_id)
      .is('user_id', null);

    if (!participants || participants.length === 0) {
      console.log('\n✅ No participant records need fixing');
      return;
    }

    console.log(`\n📝 Found ${participants.length} participant record(s) to fix`);

    // Update each record
    for (const participant of participants) {
      const { error } = await supabaseService.client
        .from('exchange_participants')
        .update({ 
          user_id: coordinator.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', participant.id);

      if (error) {
        console.log(`   ❌ Failed to update record ${participant.id}: ${error.message}`);
      } else {
        console.log(`   ✅ Updated record ${participant.id}`);
        console.log(`      Exchange: ${participant.exchange_id}`);
        console.log(`      Role: ${participant.role}`);
      }
    }

    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const { data: fixed } = await supabaseService.client
      .from('exchange_participants')
      .select('*')
      .eq('user_id', coordinator.id);

    if (fixed && fixed.length > 0) {
      console.log(`\n✅ SUCCESS! Coordinator now has ${fixed.length} participant record(s) with user_id`);
      
      // Get exchange details
      const exchangeIds = [...new Set(fixed.map(p => p.exchange_id))];
      const { data: exchanges } = await supabaseService.client
        .from('exchanges')
        .select('id, name, exchange_number')
        .in('id', exchangeIds);

      if (exchanges && exchanges.length > 0) {
        console.log('\n📁 Coordinator can now see these exchanges:');
        exchanges.forEach(ex => {
          console.log(`   - ${ex.name || ex.exchange_number}`);
        });
      }
    } else {
      console.log('⚠️ No participant records found after update');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

fixCoordinatorParticipant();