#!/usr/bin/env node

/**
 * Script to analyze why PP contacts don't match
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function analyzeMismatch() {
  console.log('🔍 Analyzing PracticePanther data mismatch...\n');

  try {
    // Get sample PP contact IDs from exchanges
    const { data: exchanges } = await supabase
      .from('exchanges')
      .select('pp_data')
      .not('pp_data', 'is', null)
      .limit(5);

    console.log('Sample PP Contact IDs from exchanges:');
    exchanges.forEach(ex => {
      if (ex.pp_data?.account_ref) {
        console.log(`  - ${ex.pp_data.account_ref.id}: ${ex.pp_data.account_ref.display_name}`);
      }
    });

    // Get sample PP contact IDs from people table
    const { data: contacts } = await supabase
      .from('people')
      .select('pp_contact_id, email, first_name, last_name')
      .eq('is_user', false)
      .not('pp_contact_id', 'is', null)
      .limit(5);

    console.log('\nSample PP Contact IDs in people table:');
    contacts.forEach(c => {
      console.log(`  - ${c.pp_contact_id}: ${c.first_name} ${c.last_name} (${c.email})`);
    });

    // Check if we need to create contacts from exchange data
    console.log('\n📊 Analysis:');
    console.log('The PP contact IDs in exchanges (account_ref.id) don\'t match the pp_contact_id in people table.');
    console.log('This suggests either:');
    console.log('1. The contacts weren\'t synced from PracticePanther yet');
    console.log('2. The account_ref.id is different from contact ID in PP');
    
    // Let's try matching by name
    console.log('\n🔍 Trying to match by name...');
    
    const { data: exchangeSample } = await supabase
      .from('exchanges')
      .select('id, name, pp_data')
      .not('pp_data', 'is', null)
      .is('client_id', null)
      .limit(3);

    for (const ex of exchangeSample) {
      if (ex.pp_data?.account_ref) {
        const displayName = ex.pp_data.account_ref.display_name;
        console.log(`\nExchange: ${ex.name}`);
        console.log(`  Looking for: ${displayName}`);
        
        // Try to parse name
        const nameParts = displayName.split(',').map(s => s.trim());
        const lastName = nameParts[0];
        const firstName = nameParts[1];
        
        // Search by name
        const { data: matches } = await supabase
          .from('people')
          .select('id, email, first_name, last_name')
          .eq('is_user', false)
          .ilike('last_name', `%${lastName}%`);
        
        if (matches && matches.length > 0) {
          console.log(`  ✅ Found ${matches.length} potential matches:`);
          matches.forEach(m => {
            console.log(`     - ${m.first_name} ${m.last_name} (${m.email})`);
          });
        } else {
          console.log('  ❌ No matches found');
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeMismatch();