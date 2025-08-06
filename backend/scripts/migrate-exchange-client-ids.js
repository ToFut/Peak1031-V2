#!/usr/bin/env node

/**
 * Migrate exchange client_ids from people table to contacts table
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function migrateExchangeClientIds() {
  console.log('🔄 Migrating exchange client_ids from people to contacts table...\n');

  try {
    // Get all exchanges with client_ids
    const { data: exchanges } = await supabase
      .from('exchanges')
      .select('id, name, client_id')
      .not('client_id', 'is', null);

    console.log(`Found ${exchanges?.length || 0} exchanges with client_ids`);

    if (!exchanges || exchanges.length === 0) {
      console.log('No exchanges to migrate');
      return;
    }

    let migratedCount = 0;
    let notFoundCount = 0;
    const batchSize = 50;

    // Process in batches
    for (let i = 0; i < exchanges.length; i += batchSize) {
      const batch = exchanges.slice(i, i + batchSize);
      console.log(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(exchanges.length/batchSize)}`);

      for (const exchange of batch) {
        try {
          // Find the corresponding contact in the new contacts table
          // We'll match by the old people.id = new contacts.id since they should be the same
          const { data: contact } = await supabase
            .from('contacts')
            .select('id')
            .eq('id', exchange.client_id)
            .single();

          if (contact) {
            // The ID already exists in contacts table, no update needed
            migratedCount++;
          } else {
            // Check if this person exists in people table and find equivalent in contacts
            const { data: person } = await supabase
              .from('people')
              .select('id, email, first_name, last_name, pp_contact_id')
              .eq('id', exchange.client_id)
              .eq('is_user', false)
              .single();

            if (person) {
              // Try to find matching contact by pp_contact_id or name+email
              let matchingContact = null;

              if (person.pp_contact_id) {
                const { data: ppContact } = await supabase
                  .from('contacts')
                  .select('id')
                  .eq('pp_contact_id', person.pp_contact_id)
                  .single();
                matchingContact = ppContact;
              }

              if (!matchingContact && person.email) {
                const { data: emailContact } = await supabase
                  .from('contacts')
                  .select('id')
                  .eq('email', person.email)
                  .single();
                matchingContact = emailContact;
              }

              if (matchingContact) {
                // Update the exchange to point to the new contact
                const { error: updateError } = await supabase
                  .from('exchanges')
                  .update({ client_id: matchingContact.id })
                  .eq('id', exchange.id);

                if (updateError) {
                  console.log(`❌ Failed to update exchange ${exchange.name}: ${updateError.message}`);
                } else {
                  console.log(`✅ Migrated: ${exchange.name}`);
                  migratedCount++;
                }
              } else {
                console.log(`⚠️  No matching contact found for: ${person.first_name} ${person.last_name} (${person.email})`);
                notFoundCount++;
              }
            } else {
              console.log(`❌ Client ID ${exchange.client_id} not found in people table`);
              notFoundCount++;
            }
          }
        } catch (error) {
          console.log(`❌ Error processing exchange ${exchange.name}: ${error.message}`);
          notFoundCount++;
        }
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Successfully migrated: ${migratedCount}`);
    console.log(`❌ Not found/failed: ${notFoundCount}`);
    console.log(`📝 Total processed: ${exchanges.length}`);

    // Final verification
    const { count: remainingOldRefs } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true })
      .not('client_id', 'is', null);

    const { count: validRefs } = await supabase
      .from('exchanges')
      .select(`
        id,
        client_id,
        client:contacts!client_id(id)
      `, { count: 'exact', head: true })
      .not('client_id', 'is', null);

    console.log(`\n🔍 Final verification:`);
    console.log(`Total exchanges with client_id: ${remainingOldRefs || 0}`);
    console.log(`Valid references to contacts table: ${validRefs || 0}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

migrateExchangeClientIds();