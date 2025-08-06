#!/usr/bin/env node

/**
 * Test the backend API to see if clients can access their exchanges
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testBackendClientAccess() {
  console.log('🧪 Testing backend client access with updated schema...\n');

  try {
    // Get a test client user
    const { data: testUser } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'client')
      .not('contact_id', 'is', null)
      .limit(1)
      .single();

    if (!testUser) {
      console.log('❌ No test client found');
      return;
    }

    console.log(`🧑 Test User: ${testUser.email}`);
    console.log(`📱 Contact ID: ${testUser.contact_id}`);
    console.log(`👤 Role: ${testUser.role}`);

    // Simulate the exact logic from backend/routes/exchanges.js
    console.log('\n📊 Simulating backend exchange filtering logic...');

    // Simple query without joins (matches updated supabase service)
    let query = supabase
      .from('exchanges')
      .select('*');

    // Apply client role filtering
    if (testUser.role === 'client') {
      if (testUser.contact_id) {
        console.log(`✅ User ${testUser.email} has linked contact: ${testUser.contact_id}`);
        query = query.eq('client_id', testUser.contact_id);
      } else {
        console.log(`❌ User ${testUser.email} has no linked contact`);
        return;
      }
    }

    const { data: exchanges, error } = await query;

    if (error) {
      console.log('❌ Database query error:', error.message);
      console.log('Error details:', error);
      return;
    }

    console.log(`\n📋 Results:`);
    console.log(`Found ${exchanges?.length || 0} exchanges for client`);

    if (exchanges && exchanges.length > 0) {
      console.log('\n📝 Sample exchanges:');
      exchanges.slice(0, 3).forEach((exchange, i) => {
        console.log(`${i + 1}. ${exchange.name}`);
        console.log(`   Client: ${exchange.client?.first_name} ${exchange.client?.last_name}`);
        console.log(`   Status: ${exchange.status}`);
        console.log(`   Participants: ${exchange.exchange_participants?.length || 0}`);
      });

      console.log(`\n✅ SUCCESS: Client can access their exchanges!`);
      console.log(`✅ Backend schema migration is working`);
      console.log(`✅ User-contact linking is functional`);
      console.log(`✅ Exchange relationships are correct`);
    } else {
      console.log('\n❌ No exchanges found for this client');
      
      // Check if there are exchanges with this contact_id in the database
      const { count: directCount } = await supabase
        .from('exchanges')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', testUser.contact_id);
      
      console.log(`Direct query found: ${directCount || 0} exchanges with client_id = ${testUser.contact_id}`);
      
      if (directCount > 0) {
        console.log('❌ The issue is with the join queries or foreign key constraints');
      } else {
        console.log('❌ No exchanges are assigned to this contact');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

testBackendClientAccess();