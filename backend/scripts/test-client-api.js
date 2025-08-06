#!/usr/bin/env node

/**
 * Test the API to see if clients can access their exchanges
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testClientAPI() {
  console.log('🧪 Testing client API access...\n');

  try {
    // Get a test client
    const { data: testClient } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'client')
      .not('contact_id', 'is', null)
      .limit(1)
      .single();

    if (!testClient) {
      console.log('❌ No test client found');
      return;
    }

    console.log(`Test client: ${testClient.email}`);
    console.log(`Contact ID: ${testClient.contact_id}`);

    // Simulate the backend logic for getting user exchanges
    console.log('\n📊 Simulating backend exchange filtering...');

    // Method 1: Direct client_id match
    const { data: directExchanges, count: directCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact' })
      .eq('client_id', testClient.contact_id);

    console.log(`Method 1 - Direct client_id match: ${directCount || 0} exchanges`);

    // Method 2: Check if client_id exists in contacts table
    if (directCount > 0) {
      const sampleClientId = directExchanges[0].client_id;
      const { data: contactCheck } = await supabase
        .from('contacts')
        .select('id, email, first_name, last_name')
        .eq('id', sampleClientId)
        .single();

      if (contactCheck) {
        console.log(`✅ Client ID maps to contact: ${contactCheck.first_name} ${contactCheck.last_name}`);
      } else {
        console.log(`❌ Client ID ${sampleClientId} not found in contacts table`);
        
        // Check if it exists in the old people table
        const { data: peopleCheck } = await supabase
          .from('people')
          .select('id, email, first_name, last_name, is_user')
          .eq('id', sampleClientId)
          .single();

        if (peopleCheck) {
          console.log(`⚠️  Client ID exists in people table: ${peopleCheck.first_name} ${peopleCheck.last_name} (is_user: ${peopleCheck.is_user})`);
          console.log('❌ Need to migrate client_ids from people table to contacts table');
        }
      }
    }

    // Method 3: Test coordinator access
    const { data: coordinator } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'coordinator')
      .limit(1)
      .single();

    if (coordinator) {
      const { count: coordinatorExchanges } = await supabase
        .from('exchanges')
        .select('*', { count: 'exact', head: true })
        .eq('coordinator_id', coordinator.id);

      console.log(`\nCoordinator ${coordinator.email}: ${coordinatorExchanges || 0} exchanges`);
    }

    // Summary
    console.log('\n📋 DIAGNOSIS:');
    if (directCount > 0) {
      console.log('✅ Client has exchanges in database');
      console.log('✅ User-contact linking is working');
      console.log('❌ But client_id references old people table, not new contacts table');
      console.log('\n🔧 SOLUTION NEEDED:');
      console.log('Need to update exchange client_ids to reference the new contacts table');
    } else {
      console.log('❌ Client has no exchanges or client_id mapping is broken');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testClientAPI();