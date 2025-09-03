/**
 * Auto-Sync Service
 * Handles automatic synchronization of PP entities to contacts/users tables
 */

const { createClient } = require('@supabase/supabase-js');
const entityExtractionService = require('./entityExtractionService');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

class AutoSyncService {
  constructor() {
    this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  }

  /**
   * Sync all entities for a specific exchange
   * @param {string} exchangeId - Exchange ID to sync
   * @returns {Object} Sync results
   */
  async syncExchangeEntities(exchangeId) {
    try {
      console.log(`🔄 Starting entity sync for exchange: ${exchangeId}`);
      
      // Start sync log
      const syncLog = await this.createSyncLog(exchangeId, 'manual');
      
      try {
        // Get exchange data
        const exchange = await this.getExchangeData(exchangeId);
        if (!exchange) {
          throw new Error('Exchange not found');
        }

        // Extract entities
        const entities = entityExtractionService.extractEntitiesFromExchange(exchange);
        console.log(`📊 Extracted ${entities.length} entities`);

        // Sync users
        const userResults = await this.syncUserEntities(
          entities.filter(e => e.type === 'user'), 
          exchangeId
        );

        // Sync contacts  
        const contactResults = await this.syncContactEntities(
          entities.filter(e => e.type === 'contact'), 
          exchangeId
        );

        // Assign exchange participants
        const participantResults = await this.assignExchangeParticipants(entities, exchangeId);

        // Link primary entities to exchange
        const linkResults = await this.linkPrimaryEntities(exchange, entities);

        // Update sync timestamps
        await this.updateSyncTimestamps(exchangeId);

        // Complete sync log
        const results = {
          entities_found: entities.length,
          users_created: userResults.created,
          users_updated: userResults.updated,
          contacts_created: contactResults.created,
          contacts_updated: contactResults.updated,
          participants_added: participantResults.added,
          primary_links_updated: linkResults.updated
        };

        await this.completeSyncLog(syncLog.id, 'completed', results);

        console.log('✅ Entity sync completed successfully');
        return { success: true, results };

      } catch (error) {
        await this.completeSyncLog(syncLog.id, 'failed', { error: error.message });
        throw error;
      }

    } catch (error) {
      console.error('❌ Entity sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync user entities
   * @param {Array} userEntities - User entities to sync
   * @param {string} exchangeId - Exchange ID
   * @returns {Object} Sync results
   */
  async syncUserEntities(userEntities, exchangeId) {
    let created = 0;
    let updated = 0;

    for (const entity of userEntities) {
      try {
        // Check if user already exists
        const existingUser = await this.findExistingUser(entity);
        
        if (existingUser) {
          // Update existing user
          await this.updateUser(existingUser.id, entity, exchangeId);
          updated++;
          console.log(`📝 Updated user: ${entity.display_name}`);
        } else {
          // Create new user
          await this.createUser(entity, exchangeId);
          created++;
          console.log(`➕ Created user: ${entity.display_name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to sync user ${entity.display_name}:`, error);
      }
    }

    return { created, updated };
  }

  /**
   * Sync contact entities
   * @param {Array} contactEntities - Contact entities to sync
   * @param {string} exchangeId - Exchange ID
   * @returns {Object} Sync results
   */
  async syncContactEntities(contactEntities, exchangeId) {
    let created = 0;
    let updated = 0;

    for (const entity of contactEntities) {
      try {
        // Check if contact already exists
        const existingContact = await this.findExistingContact(entity);
        
        if (existingContact) {
          // Update existing contact
          await this.updateContact(existingContact.id, entity, exchangeId);
          updated++;
          console.log(`📝 Updated contact: ${entity.display_name}`);
        } else {
          // Create new contact
          await this.createContact(entity, exchangeId);
          created++;
          console.log(`➕ Created contact: ${entity.display_name}`);
        }
      } catch (error) {
        console.error(`❌ Failed to sync contact ${entity.display_name}:`, error);
      }
    }

    return { created, updated };
  }

  /**
   * Find existing user by PP ID or email
   * @param {Object} entity - User entity
   * @returns {Object|null} Existing user or null
   */
  async findExistingUser(entity) {
    const { data: users } = await this.supabase
      .from('users')
      .select('*')
      .or(`pp_user_id.eq.${entity.pp_user_id},email.eq.${entity.email}`)
      .limit(1);

    return users && users.length > 0 ? users[0] : null;
  }

  /**
   * Find existing contact by PP ID, email, or name
   * @param {Object} entity - Contact entity  
   * @returns {Object|null} Existing contact or null
   */
  async findExistingContact(entity) {
    const conditions = [];
    
    if (entity.pp_contact_id) {
      conditions.push(`pp_contact_id.eq.${entity.pp_contact_id}`);
    }
    if (entity.email) {
      conditions.push(`email.eq.${entity.email}`);
    }
    
    // Fallback to name matching if no PP ID or email
    if (conditions.length === 0 && entity.parsed_name) {
      if (entity.parsed_name.company) {
        conditions.push(`company.eq.${entity.parsed_name.company}`);
      } else {
        conditions.push(`first_name.eq.${entity.parsed_name.first_name},last_name.eq.${entity.parsed_name.last_name}`);
      }
    }

    if (conditions.length === 0) return null;

    const { data: contacts } = await this.supabase
      .from('people')
      .select('*')
      .or(conditions.join(','))
      .limit(1);

    return contacts && contacts.length > 0 ? contacts[0] : null;
  }

  /**
   * Create new user
   * @param {Object} entity - User entity
   * @param {string} exchangeId - Exchange ID
   */
  async createUser(entity, exchangeId) {
    // Generate temporary password
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const userData = {
      pp_user_id: entity.pp_user_id,
      email: entity.email,
      first_name: entity.parsed_name.first_name || '',
      last_name: entity.parsed_name.last_name || '',
      role: entity.role,
      is_active: entity.is_active || true,
      password_hash: hashedPassword,
      assigned_exchanges: [exchangeId],
      total_exchanges: 1,
      last_exchange_assignment: new Date().toISOString(),
      pp_raw_data: entity.pp_raw_data,
      pp_synced_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('users')
      .insert(userData);

    if (error) throw error;

    // TODO: Send welcome email with temp password
    console.log(`🔑 User ${entity.email} created with temp password: ${tempPassword}`);
  }

  /**
   * Create new contact
   * @param {Object} entity - Contact entity
   * @param {string} exchangeId - Exchange ID
   */
  async createContact(entity, exchangeId) {
    const contactData = {
      pp_contact_id: entity.pp_contact_id,
      pp_account_ref_id: entity.pp_account_ref_id,
      first_name: entity.parsed_name.first_name || '',
      last_name: entity.parsed_name.last_name || '',
      company: entity.parsed_name.company || entity.company,
      email: entity.email,
      contact_type: entity.contact_type,
      is_primary_contact: entity.is_primary_contact,
      primary_exchange_id: entity.primary_exchange_id,
      assigned_exchanges: [exchangeId],
      total_exchanges: 1,
      last_exchange_assignment: new Date().toISOString(),
      pp_raw_data: entity.pp_raw_data,
      last_sync_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('people')
      .insert(contactData);

    if (error) throw error;
  }

  /**
   * Update existing user with exchange assignment
   * @param {string} userId - User ID
   * @param {Object} entity - User entity
   * @param {string} exchangeId - Exchange ID
   */
  async updateUser(userId, entity, exchangeId) {
    // Get current assignments
    const { data: currentUser } = await this.supabase
      .from('users')
      .select('assigned_exchanges, total_exchanges')
      .eq('id', userId)
      .single();

    const assignedExchanges = currentUser?.assigned_exchanges || [];
    
    // Add exchange if not already assigned
    if (!assignedExchanges.includes(exchangeId)) {
      assignedExchanges.push(exchangeId);
    }

    const updateData = {
      assigned_exchanges: assignedExchanges,
      total_exchanges: assignedExchanges.length,
      last_exchange_assignment: new Date().toISOString(),
      pp_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update PP data if newer
    if (entity.pp_raw_data) {
      updateData.pp_raw_data = entity.pp_raw_data;
    }

    const { error } = await this.supabase
      .from('users')
      .update(updateData)
      .eq('id', userId);

    if (error) throw error;
  }

  /**
   * Update existing contact with exchange assignment
   * @param {string} contactId - Contact ID
   * @param {Object} entity - Contact entity
   * @param {string} exchangeId - Exchange ID
   */
  async updateContact(contactId, entity, exchangeId) {
    // Get current assignments
    const { data: currentContact } = await this.supabase
      .from('people')
      .select('assigned_exchanges, total_exchanges')
      .eq('id', contactId)
      .single();

    const assignedExchanges = currentContact?.assigned_exchanges || [];
    
    // Add exchange if not already assigned
    if (!assignedExchanges.includes(exchangeId)) {
      assignedExchanges.push(exchangeId);
    }

    const updateData = {
      assigned_exchanges: assignedExchanges,
      total_exchanges: assignedExchanges.length,
      last_exchange_assignment: new Date().toISOString(),
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Update PP data if newer
    if (entity.pp_raw_data) {
      updateData.pp_raw_data = entity.pp_raw_data;
    }

    const { error } = await this.supabase
      .from('people')
      .update(updateData)
      .eq('id', contactId);

    if (error) throw error;
  }

  /**
   * Assign entities as exchange participants
   * @param {Array} entities - All entities
   * @param {string} exchangeId - Exchange ID
   * @returns {Object} Assignment results
   */
  async assignExchangeParticipants(entities, exchangeId) {
    let added = 0;
    const participantEntities = entities.filter(e => e.should_add_as_participant);

    for (const entity of participantEntities) {
      try {
        // Find the created/updated contact or user
        let entityRecord = null;
        
        if (entity.type === 'user') {
          entityRecord = await this.findExistingUser(entity);
        } else {
          entityRecord = await this.findExistingContact(entity);
        }

        if (entityRecord) {
          // Check if already a participant
          const { data: existing } = await this.supabase
            .from('exchange_participants')
            .select('id')
            .eq('exchange_id', exchangeId)
            .eq(entity.type === 'user' ? 'user_id' : 'contact_id', entityRecord.id)
            .single();

          if (!existing) {
            // Add as participant
            const participantData = {
              exchange_id: exchangeId,
              role: entity.participant_role,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };

            if (entity.type === 'user') {
              participantData.user_id = entityRecord.id;
            } else {
              participantData.contact_id = entityRecord.id;
            }

            const { error } = await this.supabase
              .from('exchange_participants')
              .insert(participantData);

            if (error) throw error;

            added++;
            console.log(`🤝 Added ${entity.display_name} as ${entity.participant_role} participant`);
          }
        }
      } catch (error) {
        console.error(`❌ Failed to add participant ${entity.display_name}:`, error);
      }
    }

    return { added };
  }

  /**
   * Link primary entities to exchange
   * @param {Object} exchange - Exchange data
   * @param {Array} entities - All entities
   * @returns {Object} Link results
   */
  async linkPrimaryEntities(exchange, entities) {
    let updated = 0;
    const updateData = {};

    // Find primary client
    const primaryClient = entities.find(e => e.should_set_as_client);
    if (primaryClient) {
      const clientContact = await this.findExistingContact(primaryClient);
      if (clientContact) {
        updateData.client_id = clientContact.id;
        updated++;
      }
    }

    // Find primary coordinator
    const primaryCoordinator = entities.find(e => e.should_set_as_coordinator);
    if (primaryCoordinator) {
      const coordinatorUser = await this.findExistingUser(primaryCoordinator);
      if (coordinatorUser) {
        updateData.coordinator_id = coordinatorUser.id;
        updateData.primary_attorney_id = coordinatorUser.id;
        updated++;
      }
    }

    // Update exchange if we have changes
    if (Object.keys(updateData).length > 0) {
      updateData.updated_at = new Date().toISOString();
      
      const { error } = await this.supabase
        .from('exchanges')
        .update(updateData)
        .eq('id', exchange.id);

      if (error) throw error;

      console.log(`🔗 Updated exchange primary links:`, updateData);
    }

    return { updated };
  }

  /**
   * Sync all exchanges in the database
   * @returns {Object} Overall sync results
   */
  async syncAllExchanges() {
    try {
      console.log('🚀 Starting comprehensive sync of all exchanges...');
      
      // Get all exchanges
      const { data: exchanges, error } = await this.supabase
        .from('exchanges')
        .select('*')
        .not('pp_data', 'is', null)
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      console.log(`📊 Found ${exchanges.length} exchanges with PP data to sync`);
      
      const results = {
        totalExchanges: exchanges.length,
        processed: 0,
        successful: 0,
        failed: 0,
        errors: [],
        entityStats: {
          usersCreated: 0,
          contactsCreated: 0,
          participantsAdded: 0
        }
      };
      
      // Process each exchange
      for (const exchange of exchanges) {
        try {
          console.log(`\n🔄 Processing: ${exchange.name} (${exchange.id})`);
          results.processed++;
          
          const syncResult = await this.syncExchangeEntities(exchange.id);
          
          results.successful++;
          results.entityStats.usersCreated += syncResult.users?.created || 0;
          results.entityStats.contactsCreated += syncResult.contacts?.created || 0;
          results.entityStats.participantsAdded += syncResult.participants?.added || 0;
          
          console.log(`✅ Completed: ${exchange.name}`);
          
        } catch (error) {
          results.failed++;
          results.errors.push({
            exchangeId: exchange.id,
            exchangeName: exchange.name,
            error: error.message
          });
          console.error(`❌ Failed: ${exchange.name}:`, error.message);
        }
      }
      
      console.log('\n🎉 COMPREHENSIVE SYNC COMPLETED!');
      console.log('======================================');
      console.log(`📊 Results Summary:`);
      console.log(`   Total Exchanges: ${results.totalExchanges}`);
      console.log(`   Processed: ${results.processed}`);
      console.log(`   Successful: ${results.successful}`);
      console.log(`   Failed: ${results.failed}`);
      console.log(`   Users Created: ${results.entityStats.usersCreated}`);
      console.log(`   Contacts Created: ${results.entityStats.contactsCreated}`);
      console.log(`   Participants Added: ${results.entityStats.participantsAdded}`);
      
      if (results.errors.length > 0) {
        console.log(`❌ Errors:`);
        results.errors.forEach(err => {
          console.log(`   - ${err.exchangeName}: ${err.error}`);
        });
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Comprehensive sync failed:', error);
      throw error;
    }
  }

  /**
   * Get exchange data
   * @param {string} exchangeId - Exchange ID
   * @returns {Object} Exchange data
   */
  async getExchangeData(exchangeId) {
    const { data: exchange, error } = await this.supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    if (error) throw error;
    return exchange;
  }

  /**
   * Create sync log entry
   * @param {string} exchangeId - Exchange ID
   * @param {string} syncType - Sync type
   * @returns {Object} Sync log entry
   */
  async createSyncLog(exchangeId, syncType) {
    const { data: log, error } = await this.supabase
      .from('entity_sync_logs')
      .insert({
        exchange_id: exchangeId,
        sync_type: syncType,
        sync_status: 'running',
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return log;
  }

  /**
   * Complete sync log entry
   * @param {string} logId - Log ID
   * @param {string} status - Completion status
   * @param {Object} results - Sync results
   */
  async completeSyncLog(logId, status, results) {
    const updateData = {
      sync_status: status,
      completed_at: new Date().toISOString()
    };

    if (status === 'completed') {
      Object.assign(updateData, results);
    } else {
      updateData.sync_errors = results;
    }

    const { error } = await this.supabase
      .from('entity_sync_logs')
      .update(updateData)
      .eq('id', logId);

    if (error) console.error('Failed to update sync log:', error);
  }

  /**
   * Update exchange sync timestamps
   * @param {string} exchangeId - Exchange ID
   */
  async updateSyncTimestamps(exchangeId) {
    const { error } = await this.supabase
      .from('exchanges')
      .update({
        entities_synced_at: new Date().toISOString(),
        entities_sync_status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', exchangeId);

    if (error) {
      console.error('Failed to update sync timestamps:', error);
    }
  }
}

module.exports = new AutoSyncService();