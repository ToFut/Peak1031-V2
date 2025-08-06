#!/usr/bin/env node

/**
 * Smart matching script to fix exchange-client relationships
 * Tries multiple strategies: PP ID, email, name matching
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function smartFixExchanges() {
  console.log('🧠 Smart fix for exchange-client relationships...\n');

  try {
    // Get all exchanges with no client
    const { data: exchanges, error: exError } = await supabase
      .from('exchanges')
      .select('*')
      .is('client_id', null)
      .not('pp_data', 'is', null);

    if (exError) throw exError;

    console.log(`Found ${exchanges.length} exchanges to process\n`);

    let fixedByPPId = 0;
    let fixedByName = 0;
    let created = 0;
    let notFound = 0;

    // Process all exchanges
    for (let i = 0; i < exchanges.length; i++) {
      const exchange = exchanges[i];
      
      if (exchange.pp_data?.account_ref) {
        const accountRef = exchange.pp_data.account_ref;
        const displayName = accountRef.display_name;
        let contactId = null;
        
        // Strategy 1: Try by PP ID
        const { data: contactByPP } = await supabase
          .from('people')
          .select('id')
          .eq('is_user', false)
          .eq('pp_contact_id', accountRef.id)
          .single();
        
        if (contactByPP) {
          contactId = contactByPP.id;
          fixedByPPId++;
        } else {
          // Strategy 2: Try by name
          const nameParts = displayName.split(',').map(s => s.trim());
          const lastName = nameParts[0];
          const firstName = nameParts[1] || '';
          
          const { data: contactByName } = await supabase
            .from('people')
            .select('id')
            .eq('is_user', false)
            .ilike('last_name', lastName)
            .ilike('first_name', `${firstName}%`)
            .single();
          
          if (contactByName) {
            contactId = contactByName.id;
            fixedByName++;
          } else {
            // Strategy 3: Create new contact
            const { data: newContact, error: createError } = await supabase
              .from('people')
              .insert({
                first_name: firstName,
                last_name: lastName,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@imported.com`,
                is_user: false,
                pp_contact_id: accountRef.id,
                source: 'exchange_import',
                pp_data: { account_ref: accountRef }
              })
              .select()
              .single();
            
            if (newContact && !createError) {
              contactId = newContact.id;
              created++;
            } else {
              notFound++;
            }
          }
        }
        
        // Update exchange if we found/created a contact
        if (contactId) {
          await supabase
            .from('exchanges')
            .update({ client_id: contactId })
            .eq('id', exchange.id);
        }
      }
      
      // Progress indicator
      if ((i + 1) % 100 === 0) {
        console.log(`Progress: ${i + 1}/${exchanges.length} processed...`);
      }
    }

    console.log('\n\n✅ FINAL RESULTS:');
    console.log('=================');
    console.log(`Fixed by PP ID match: ${fixedByPPId}`);
    console.log(`Fixed by name match: ${fixedByName}`);
    console.log(`Created new contacts: ${created}`);
    console.log(`Not processed: ${notFound}`);
    console.log(`TOTAL FIXED: ${fixedByPPId + fixedByName + created}`);

    // Verify
    const { count: remainingCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true })
      .is('client_id', null);

    console.log(`\n📊 Remaining exchanges without clients: ${remainingCount}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Run it
smartFixExchanges();