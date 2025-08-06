#!/usr/bin/env node

/**
 * Check foreign key relationships in the database
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkForeignKeys() {
  console.log('🔍 Checking foreign key relationships...\n');

  try {
    // Test simple queries without joins first
    console.log('🧪 Testing basic table access:');
    
    const { count: exchangesCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
    
    const { count: contactsCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true });
    
    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    console.log(`✅ Exchanges table: ${exchangesCount || 0} records`);
    console.log(`✅ Contacts table: ${contactsCount || 0} records`);
    console.log(`✅ Users table: ${usersCount || 0} records`);

    // Test simple join without explicit foreign key names
    console.log('\n🔗 Testing joins:');
    
    // Try basic join
    const { data: basicJoin, error: basicError } = await supabase
      .from('exchanges')
      .select(`
        id,
        name,
        client_id,
        contacts(id, first_name, last_name)
      `)
      .limit(1);

    if (basicError) {
      console.log('❌ Basic join to contacts failed:', basicError.message);
      
      // Check if we can at least get data without joins
      const { data: exchangeData } = await supabase
        .from('exchanges')
        .select('id, name, client_id, coordinator_id')
        .not('client_id', 'is', null)
        .limit(1)
        .single();

      if (exchangeData) {
        console.log(`\n📝 Sample exchange data:`);
        console.log(`ID: ${exchangeData.id}`);
        console.log(`Name: ${exchangeData.name}`);
        console.log(`Client ID: ${exchangeData.client_id}`);
        console.log(`Coordinator ID: ${exchangeData.coordinator_id}`);

        // Check if these IDs exist in contacts table
        const { data: client } = await supabase
          .from('contacts')
          .select('id, first_name, last_name, email')
          .eq('id', exchangeData.client_id)
          .single();

        if (client) {
          console.log(`✅ Client ID exists in contacts: ${client.first_name} ${client.last_name}`);
        } else {
          console.log(`❌ Client ID not found in contacts table`);
        }

        if (exchangeData.coordinator_id) {
          const { data: coordinator } = await supabase
            .from('contacts')
            .select('id, first_name, last_name, email')
            .eq('id', exchangeData.coordinator_id)
            .single();

          if (coordinator) {
            console.log(`✅ Coordinator ID exists in contacts: ${coordinator.first_name} ${coordinator.last_name}`);
          } else {
            console.log(`❌ Coordinator ID not found in contacts table`);
          }
        }
      }
    } else {
      console.log('✅ Basic join to contacts works');
    }

    // Try alternative query approach - manual joins
    console.log('\n🔧 Testing manual join approach:');
    const { data: exchanges } = await supabase
      .from('exchanges')
      .select('id, name, client_id')
      .not('client_id', 'is', null)
      .limit(5);

    if (exchanges) {
      for (const exchange of exchanges) {
        const { data: client } = await supabase
          .from('contacts')
          .select('first_name, last_name')
          .eq('id', exchange.client_id)
          .single();

        if (client) {
          console.log(`✅ ${exchange.name} -> ${client.first_name} ${client.last_name}`);
        } else {
          console.log(`❌ ${exchange.name} -> Client not found`);
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkForeignKeys();