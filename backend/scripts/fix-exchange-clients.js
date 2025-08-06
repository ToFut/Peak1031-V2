#!/usr/bin/env node

/**
 * Script to fix exchanges with no client assigned
 * Maps exchanges to clients based on PracticePanther data
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixExchangeClients() {
  console.log('🔧 Fixing exchanges with no client assigned...\n');

  try {
    // Get all exchanges with no client
    const { data: exchanges, error: exError } = await supabase
      .from('exchanges')
      .select('*')
      .is('client_id', null);

    if (exError) throw exError;

    console.log(`Found ${exchanges.length} exchanges without clients\n`);

    let fixed = 0;
    let notFound = 0;

    for (const exchange of exchanges.slice(0, 10)) { // Process first 10 as example
      console.log(`\nProcessing exchange: ${exchange.name || exchange.exchange_name}`);
      
      // Try to find client from pp_data
      if (exchange.pp_data && exchange.pp_data.client) {
        const ppClientData = exchange.pp_data.client;
        console.log(`  PP Client info: ${ppClientData.display_name || ppClientData.name}`);
        
        // Try to find contact by PP ID
        let contact = null;
        
        if (ppClientData.id) {
          const { data: contactByPP } = await supabase
            .from('people')
            .select('*')
            .eq('is_user', false)
            .eq('pp_contact_id', ppClientData.id)
            .single();
          
          contact = contactByPP;
        }
        
        // If not found by PP ID, try by name/email
        if (!contact && ppClientData.email) {
          const { data: contactByEmail } = await supabase
            .from('people')
            .select('*')
            .eq('is_user', false)
            .ilike('email', ppClientData.email)
            .single();
          
          contact = contactByEmail;
        }
        
        if (contact) {
          // Update exchange with client_id
          const { error: updateError } = await supabase
            .from('exchanges')
            .update({ client_id: contact.id })
            .eq('id', exchange.id);
          
          if (!updateError) {
            console.log(`  ✅ Linked to contact: ${contact.email || contact.id}`);
            fixed++;
          } else {
            console.log(`  ❌ Error updating: ${updateError.message}`);
          }
        } else {
          console.log('  ⚠️  No matching contact found');
          notFound++;
        }
      } else {
        console.log('  ⚠️  No PP client data in exchange');
        notFound++;
      }
    }

    console.log('\n\n📊 Summary:');
    console.log(`✅ Fixed: ${fixed} exchanges`);
    console.log(`⚠️  Not found: ${notFound} exchanges`);
    console.log(`\nThis was a sample of 10 exchanges. To fix all, remove the slice(0, 10) limit.`);

  } catch (error) {
    console.error('Error:', error);
  }
}

fixExchangeClients();