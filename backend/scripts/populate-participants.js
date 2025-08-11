/**
 * Populate Exchange Participants Table
 * Extracts participants from existing exchange data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function populateParticipants() {
  console.log('📊 Populating exchange_participants table...\n');

  try {
    // Get all exchanges
    const { data: exchanges, error: exError } = await supabase
      .from('exchanges')
      .select('id, client_id, coordinator_id, primary_attorney_id, assigned_users')
      .limit(5000);

    if (exError) {
      console.error('Error fetching exchanges:', exError);
      return;
    }

    console.log(`Found ${exchanges.length} exchanges to process`);

    let participantsAdded = 0;
    let errors = 0;

    for (const exchange of exchanges) {
      // Add client as participant
      if (exchange.client_id) {
        const { error } = await supabase
          .from('exchange_participants')
          .upsert({
            exchange_id: exchange.id,
            contact_id: exchange.client_id,
            role: 'client',
            permissions: {
              view: true,
              edit: false,
              upload: true,
              message: true
            }
          }, {
            onConflict: 'exchange_id,contact_id'
          });

        if (!error) {
          participantsAdded++;
        } else if (!error.message?.includes('duplicate')) {
          console.error(`Error adding client participant:`, error.message);
          errors++;
        }
      }

      // Add coordinator as participant (user, not contact)
      if (exchange.coordinator_id) {
        // Check if coordinator exists in users table
        const { data: user } = await supabase
          .from('users')
          .select('id')
          .eq('id', exchange.coordinator_id)
          .single();

        if (user) {
          const { error } = await supabase
            .from('exchange_participants')
            .upsert({
              exchange_id: exchange.id,
              user_id: exchange.coordinator_id,
              role: 'coordinator',
              permissions: {
                view: true,
                edit: true,
                upload: true,
                message: true,
                manage: true
              }
            }, {
              onConflict: 'exchange_id,user_id'
            });

          if (!error) {
            participantsAdded++;
          } else if (!error.message?.includes('duplicate')) {
            console.error(`Error adding coordinator participant:`, error.message);
            errors++;
          }
        }
      }

      // Add attorney as participant if exists
      if (exchange.primary_attorney_id) {
        const { error } = await supabase
          .from('exchange_participants')
          .upsert({
            exchange_id: exchange.id,
            user_id: exchange.primary_attorney_id,
            role: 'attorney',
            permissions: {
              view: true,
              edit: true,
              upload: true,
              message: true,
              manage: true
            }
          }, {
            onConflict: 'exchange_id,user_id'
          });

        if (!error) {
          participantsAdded++;
        } else if (!error.message?.includes('duplicate')) {
          console.error(`Error adding attorney participant:`, error.message);
          errors++;
        }
      }

      // Process assigned users if any
      if (exchange.assigned_users && Array.isArray(exchange.assigned_users)) {
        for (const userId of exchange.assigned_users) {
          const { error } = await supabase
            .from('exchange_participants')
            .upsert({
              exchange_id: exchange.id,
              user_id: userId,
              role: 'assigned_staff',
              permissions: {
                view: true,
                edit: true,
                upload: true,
                message: true
              }
            }, {
              onConflict: 'exchange_id,user_id'
            });

          if (!error) {
            participantsAdded++;
          } else if (!error.message?.includes('duplicate')) {
            errors++;
          }
        }
      }
    }

    console.log('\n✅ PARTICIPANTS POPULATION COMPLETE!');
    console.log(`   • Participants added: ${participantsAdded}`);
    console.log(`   • Errors: ${errors}`);
    console.log(`   • Exchanges processed: ${exchanges.length}`);

    // Verify the data
    const { count } = await supabase
      .from('exchange_participants')
      .select('*', { count: 'exact', head: true });

    console.log(`\n📊 Total participants in database: ${count}`);

  } catch (error) {
    console.error('❌ Error populating participants:', error);
  }
}

// Run the script
populateParticipants();