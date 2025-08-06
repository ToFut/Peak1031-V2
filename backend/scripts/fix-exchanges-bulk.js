#!/usr/bin/env node

/**
 * Bulk fix for exchange-client relationships
 * Creates missing contacts in bulk then links exchanges
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function bulkFixExchanges() {
  console.log('⚡ Bulk fix for exchange-client relationships...\n');

  try {
    // Get all exchanges with no client
    const { data: exchanges, error: exError } = await supabase
      .from('exchanges')
      .select('id, name, pp_data')
      .is('client_id', null)
      .not('pp_data', 'is', null);

    if (exError) throw exError;

    console.log(`Found ${exchanges.length} exchanges to process\n`);

    // Step 1: Collect unique clients from exchanges
    const clientsMap = new Map();
    
    exchanges.forEach(exchange => {
      if (exchange.pp_data?.account_ref) {
        const ref = exchange.pp_data.account_ref;
        if (!clientsMap.has(ref.id)) {
          const nameParts = ref.display_name.split(',').map(s => s.trim());
          clientsMap.set(ref.id, {
            pp_contact_id: ref.id,
            first_name: nameParts[1] || '',
            last_name: nameParts[0] || ref.display_name,
            email: `${(nameParts[1] || 'contact').toLowerCase()}.${(nameParts[0] || 'unknown').toLowerCase()}@imported.com`,
            is_user: false,
            source: 'exchange_import',
            pp_data: { account_ref: ref }
          });
        }
      }
    });

    console.log(`Found ${clientsMap.size} unique clients to create\n`);

    // Step 2: Check which already exist
    const ppIds = Array.from(clientsMap.keys());
    const { data: existingContacts } = await supabase
      .from('people')
      .select('id, pp_contact_id')
      .eq('is_user', false)
      .in('pp_contact_id', ppIds);

    const existingPPIds = new Set(existingContacts?.map(c => c.pp_contact_id) || []);
    console.log(`${existingPPIds.size} contacts already exist`);

    // Step 3: Create missing contacts in bulk
    const contactsToCreate = Array.from(clientsMap.entries())
      .filter(([ppId, _]) => !existingPPIds.has(ppId))
      .map(([_, contact]) => contact);

    if (contactsToCreate.length > 0) {
      console.log(`Creating ${contactsToCreate.length} new contacts...`);
      
      // Insert in batches of 100
      for (let i = 0; i < contactsToCreate.length; i += 100) {
        const batch = contactsToCreate.slice(i, i + 100);
        const { error: insertError } = await supabase
          .from('people')
          .insert(batch);
        
        if (insertError) {
          console.error('Error inserting batch:', insertError);
        } else {
          console.log(`  Created batch ${Math.floor(i/100) + 1}/${Math.ceil(contactsToCreate.length/100)}`);
        }
      }
    }

    // Step 4: Get all contacts (existing + new)
    console.log('\nFetching all contacts...');
    const { data: allContacts } = await supabase
      .from('people')
      .select('id, pp_contact_id')
      .eq('is_user', false)
      .in('pp_contact_id', ppIds);

    const ppIdToContactId = new Map(
      allContacts?.map(c => [c.pp_contact_id, c.id]) || []
    );

    console.log(`Found ${ppIdToContactId.size} total contacts\n`);

    // Step 5: Update exchanges in bulk
    console.log('Updating exchanges...');
    let updated = 0;
    
    for (let i = 0; i < exchanges.length; i += 50) {
      const batch = exchanges.slice(i, i + 50);
      
      for (const exchange of batch) {
        if (exchange.pp_data?.account_ref) {
          const contactId = ppIdToContactId.get(exchange.pp_data.account_ref.id);
          
          if (contactId) {
            await supabase
              .from('exchanges')
              .update({ client_id: contactId })
              .eq('id', exchange.id);
            updated++;
          }
        }
      }
      
      console.log(`  Updated ${updated} exchanges so far...`);
    }

    console.log('\n\n✅ FINAL RESULTS:');
    console.log('=================');
    console.log(`Total exchanges updated: ${updated}`);

    // Verify
    const { count: remainingCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true })
      .is('client_id', null);

    console.log(`\n📊 Remaining exchanges without clients: ${remainingCount || 0}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run it
bulkFixExchanges();