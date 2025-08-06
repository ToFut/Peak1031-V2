#!/usr/bin/env node

/**
 * Script to fix exchanges with no client assigned
 * Maps exchanges to clients based on PracticePanther account_ref
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
      .is('client_id', null)
      .not('pp_data', 'is', null);

    if (exError) throw exError;

    console.log(`Found ${exchanges.length} exchanges without clients but with PP data\n`);

    let fixed = 0;
    let notFound = 0;
    const notFoundClients = new Set();

    // Process in batches
    const batchSize = 50;
    for (let i = 0; i < exchanges.length; i += batchSize) {
      const batch = exchanges.slice(i, i + batchSize);
      console.log(`\nProcessing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(exchanges.length/batchSize)}...`);

      for (const exchange of batch) {
        // Get client info from account_ref
        if (exchange.pp_data && exchange.pp_data.account_ref) {
          const accountRef = exchange.pp_data.account_ref;
          
          // Try to find contact by PP ID
          const { data: contact, error: contactError } = await supabase
            .from('people')
            .select('*')
            .eq('is_user', false)
            .eq('pp_contact_id', accountRef.id)
            .single();
          
          if (contact && !contactError) {
            // Update exchange with client_id
            const { error: updateError } = await supabase
              .from('exchanges')
              .update({ client_id: contact.id })
              .eq('id', exchange.id);
            
            if (!updateError) {
              fixed++;
              if (fixed % 10 === 0) {
                console.log(`  ✅ Fixed ${fixed} exchanges so far...`);
              }
            }
          } else {
            notFound++;
            notFoundClients.add(`${accountRef.display_name} (PP ID: ${accountRef.id})`);
          }
        }
      }
    }

    console.log('\n\n📊 Final Summary:');
    console.log(`✅ Successfully fixed: ${fixed} exchanges`);
    console.log(`⚠️  Clients not found: ${notFound} exchanges`);
    
    if (notFoundClients.size > 0) {
      console.log('\n❌ Missing contacts (need to sync from PracticePanther):');
      Array.from(notFoundClients).slice(0, 10).forEach(client => {
        console.log(`   - ${client}`);
      });
      if (notFoundClients.size > 10) {
        console.log(`   ... and ${notFoundClients.size - 10} more`);
      }
    }

    // Verify the fix
    const { count: remainingCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true })
      .is('client_id', null);

    console.log(`\n📊 Remaining exchanges without clients: ${remainingCount}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

// Add command line option to run
if (process.argv.includes('--run')) {
  fixExchangeClients();
} else {
  console.log('This script will fix exchanges with missing client assignments.');
  console.log('Run with --run flag to execute:');
  console.log('  node fix-exchange-clients-final.js --run');
}