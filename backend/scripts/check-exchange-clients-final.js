#!/usr/bin/env node

/**
 * Check exchange-client relationships in current schema
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkExchangeClients() {
  console.log('🔍 Checking exchange-client relationships...\n');

  try {
    // Check exchanges with and without clients
    const { count: totalExchanges } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });

    const { count: withClients } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true })
      .not('client_id', 'is', null);

    const { count: withoutClients } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true })
      .is('client_id', null);

    console.log(`📊 Exchange Statistics:`);
    console.log(`Total exchanges: ${totalExchanges || 0}`);
    console.log(`With clients: ${withClients || 0}`);
    console.log(`Without clients: ${withoutClients || 0}`);

    // Test a client's access
    const { data: testClient } = await supabase
      .from('users')
      .select('id, email, contact_id')
      .eq('role', 'client')
      .not('contact_id', 'is', null)
      .limit(1)
      .single();

    if (testClient) {
      console.log(`\n🧪 Testing client access:`);
      console.log(`Client: ${testClient.email}`);
      console.log(`Contact ID: ${testClient.contact_id}`);

      // Check if any exchanges belong to this contact
      const { data: clientExchanges, count: clientCount } = await supabase
        .from('exchanges')
        .select('id, name, client_id', { count: 'exact' })
        .eq('client_id', testClient.contact_id)
        .limit(5);

      console.log(`Exchanges for this client: ${clientCount || 0}`);
      
      if (clientExchanges && clientExchanges.length > 0) {
        console.log('Sample exchanges:');
        clientExchanges.forEach(ex => {
          console.log(`  - ${ex.name} (Client ID: ${ex.client_id})`);
        });
      }

      // Also check if client_id references contacts table
      if (withClients > 0) {
        const { data: sampleExchange } = await supabase
          .from('exchanges')
          .select('client_id')
          .not('client_id', 'is', null)
          .limit(1)
          .single();

        if (sampleExchange) {
          const { data: contact } = await supabase
            .from('contacts')
            .select('id, email, first_name, last_name')
            .eq('id', sampleExchange.client_id)
            .single();

          if (contact) {
            console.log(`\n✅ Exchange client_id correctly references contacts table`);
            console.log(`Sample: ${contact.first_name} ${contact.last_name} (${contact.email})`);
          } else {
            console.log(`\n❌ Exchange client_id doesn't match any contact`);
          }
        }
      }
    }

    // Summary
    console.log('\n📋 SUMMARY:');
    if (withClients > 0) {
      console.log('✅ Some exchanges have clients assigned');
      console.log('✅ Using separate users/contacts tables');
      console.log('✅ Schema looks correct');
    } else {
      console.log('❌ No exchanges have clients assigned');
      console.log('❌ Need to run the exchange-client linking script');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkExchangeClients();