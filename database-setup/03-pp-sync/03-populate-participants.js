#!/usr/bin/env node
/**
 * Populate Exchange Participants from Existing Data
 * Maps relationships between users and exchanges based on PracticePanther data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

class ParticipantPopulator {
  constructor() {
    this.stats = {
      processed: 0,
      created: 0,
      skipped: 0,
      errors: 0
    };
  }

  async populateParticipants() {
    console.log('🔄 Starting participant population...');
    
    try {
      // Get all exchanges with their PP matter data
      const { data: exchanges, error: exchangeError } = await supabase
        .from('exchanges')
        .select('id, name, client_id, coordinator_id, pp_matter_id, pp_raw_data')
        .not('pp_matter_id', 'is', null);

      if (exchangeError) {
        throw exchangeError;
      }

      console.log(`📊 Found ${exchanges.length} exchanges to process`);

      // Get all users for mapping
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email, pp_user_id, role');

      if (userError) {
        throw userError;
      }

      console.log(`👥 Found ${users.length} users for mapping`);

      // Get all contacts for mapping
      const { data: contacts, error: contactError } = await supabase
        .from('contacts')
        .select('id, email, pp_contact_id');

      if (contactError) {
        throw contactError;
      }

      console.log(`👨‍👩‍👧‍👦 Found ${contacts.length} contacts for mapping`);

      // Process each exchange
      for (const exchange of exchanges) {
        this.stats.processed++;
        
        try {
          await this.processExchange(exchange, users, contacts);
          
          if (this.stats.processed % 100 === 0) {
            console.log(`📊 Progress: ${this.stats.processed}/${exchanges.length} exchanges processed`);
          }
        } catch (error) {
          console.error(`❌ Error processing exchange ${exchange.id}:`, error.message);
          this.stats.errors++;
        }
      }

      // Final summary
      console.log('\n🎉 PARTICIPANT POPULATION COMPLETE!');
      console.log('=====================================');
      console.log(`📊 Processed: ${this.stats.processed} exchanges`);
      console.log(`✅ Created: ${this.stats.created} participant relationships`);
      console.log(`⏭️ Skipped: ${this.stats.skipped} (already existed)`);
      console.log(`❌ Errors: ${this.stats.errors}`);

    } catch (error) {
      console.error('❌ Fatal error:', error);
      throw error;
    }
  }

  async processExchange(exchange, users, contacts) {
    const participantsToCreate = [];

    // 1. Add the client as a participant if they exist
    if (exchange.client_id) {
      // Check if client is also a user
      const clientUser = users.find(u => {
        // Find contact first
        const contact = contacts.find(c => c.id === exchange.client_id);
        if (contact && contact.email) {
          return u.email === contact.email;
        }
        return false;
      });

      if (clientUser) {
        participantsToCreate.push({
          exchange_id: exchange.id,
          user_id: clientUser.id,
          contact_id: exchange.client_id,
          role: 'client',
          can_view_documents: true,
          can_upload_documents: true,
          can_message: true,
          pp_synced: true
        });
      }
    }

    // 2. Add the coordinator as a participant if they exist
    if (exchange.coordinator_id) {
      participantsToCreate.push({
        exchange_id: exchange.id,
        user_id: exchange.coordinator_id,
        contact_id: null, // Coordinators are users, not contacts
        role: 'coordinator',
        can_view_documents: true,
        can_upload_documents: true,
        can_message: true,
        can_manage: true,
        pp_synced: true
      });
    }

    // 3. Extract additional participants from PP raw data
    if (exchange.pp_raw_data && typeof exchange.pp_raw_data === 'object') {
      const ppData = exchange.pp_raw_data;
      
      // Check for additional contacts in PP data
      if (ppData.contacts && Array.isArray(ppData.contacts)) {
        for (const ppContact of ppData.contacts) {
          if (ppContact.id && ppContact.email) {
            // Find matching contact in our system
            const localContact = contacts.find(c => 
              c.pp_contact_id === ppContact.id.toString()
            );

            if (localContact) {
              // Check if this contact is also a user
              const contactUser = users.find(u => u.email === ppContact.email);
              
              if (contactUser) {
                // Avoid duplicates
                const isDuplicate = participantsToCreate.some(p => 
                  p.user_id === contactUser.id && p.exchange_id === exchange.id
                );

                if (!isDuplicate) {
                  participantsToCreate.push({
                    exchange_id: exchange.id,
                    user_id: contactUser.id,
                    contact_id: localContact.id,
                    role: this.determineRoleFromPPData(ppContact, contactUser),
                    can_view_documents: true,
                    can_upload_documents: false,
                    can_message: true,
                    pp_synced: true
                  });
                }
              }
            }
          }
        }
      }

      // Check for assigned users in PP data
      if (ppData.assigned_users && Array.isArray(ppData.assigned_users)) {
        for (const ppUser of ppData.assigned_users) {
          const localUser = users.find(u => 
            u.pp_user_id === ppUser.id.toString()
          );

          if (localUser) {
            // Avoid duplicates
            const isDuplicate = participantsToCreate.some(p => 
              p.user_id === localUser.id && p.exchange_id === exchange.id
            );

            if (!isDuplicate) {
              participantsToCreate.push({
                exchange_id: exchange.id,
                user_id: localUser.id,
                contact_id: null,
                role: this.determineRoleFromUser(localUser),
                can_view_documents: true,
                can_upload_documents: localUser.role !== 'client',
                can_message: true,
                can_manage: ['admin', 'coordinator'].includes(localUser.role),
                pp_synced: true
              });
            }
          }
        }
      }
    }

    // 4. Insert all participants for this exchange
    if (participantsToCreate.length > 0) {
      for (const participant of participantsToCreate) {
        try {
          // Check if relationship already exists
          const { data: existing } = await supabase
            .from('exchange_participants')
            .select('id')
            .eq('exchange_id', participant.exchange_id)
            .eq('user_id', participant.user_id)
            .single();

          if (existing) {
            this.stats.skipped++;
            continue;
          }

          // Insert new participant
          const { error: insertError } = await supabase
            .from('exchange_participants')
            .insert(participant);

          if (insertError) {
            console.error(`❌ Error inserting participant:`, insertError.message);
            this.stats.errors++;
          } else {
            this.stats.created++;
          }
        } catch (error) {
          console.error(`❌ Error processing participant:`, error.message);
          this.stats.errors++;
        }
      }
    }
  }

  determineRoleFromPPData(ppContact, user) {
    // Use the user's role if they have one
    if (user && user.role) {
      return user.role;
    }

    // Try to determine from PP contact type
    if (ppContact.type) {
      const type = ppContact.type.toLowerCase();
      if (type.includes('client')) return 'client';
      if (type.includes('attorney') || type.includes('legal')) return 'third_party';
      if (type.includes('agent') || type.includes('broker')) return 'third_party';
    }

    // Default to client
    return 'client';
  }

  determineRoleFromUser(user) {
    return user.role || 'client';
  }

  async run() {
    console.log('🚀 Starting Exchange Participant Population');
    console.log('===========================================');
    
    const startTime = Date.now();

    try {
      await this.populateParticipants();
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`⏱️ Total time: ${duration} seconds`);
      
    } catch (error) {
      console.error('❌ Population failed:', error);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const populator = new ParticipantPopulator();
  populator.run().catch(console.error);
}

module.exports = ParticipantPopulator;