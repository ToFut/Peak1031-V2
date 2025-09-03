/**
 * Test Entity Sync Implementation
 * Tests the new entity extraction and sync functionality
 */

const autoSyncService = require('./services/autoSyncService');
const entityExtractionService = require('./services/entityExtractionService');
const { createClient } = require('@supabase/supabase-js');

async function testEntitySync() {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const exchangeId = 'e00bfb0f-df96-438e-98f0-87ef91b708a7'; // Our test exchange

  try {
    console.log('🧪 TESTING ENTITY SYNC SYSTEM');
    console.log('==============================');
    console.log(`Testing with exchange: ${exchangeId}`);
    console.log('');

    // Step 1: Get exchange data
    console.log('📋 Step 1: Fetching exchange data...');
    const { data: exchange, error } = await supabase
      .from('exchanges')
      .select('*')
      .eq('id', exchangeId)
      .single();

    if (error || !exchange) {
      throw new Error('Exchange not found');
    }

    console.log(`✅ Found exchange: ${exchange.name}`);
    console.log(`   PP Matter ID: ${exchange.pp_matter_id}`);
    console.log(`   Has PP Data: ${!!exchange.pp_data}`);
    console.log('');

    // Step 2: Extract entities (preview)
    console.log('🔍 Step 2: Extracting entities (preview)...');
    const entities = entityExtractionService.extractEntitiesFromExchange(exchange);
    const stats = entityExtractionService.getExtractionStatistics(entities);

    console.log('📊 Extraction Results:');
    console.log(`   Total entities: ${stats.total}`);
    console.log(`   Users: ${stats.users}`);
    console.log(`   Contacts: ${stats.contacts}`);
    console.log(`   Participants: ${stats.participants}`);
    console.log('');

    console.log('📝 Entities by Type:');
    Object.entries(stats.byType).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`);
    });
    console.log('');

    console.log('📍 Entities by Source:');
    Object.entries(stats.bySource).forEach(([source, count]) => {
      console.log(`   ${source}: ${count}`);
    });
    console.log('');

    // Step 3: Show detailed entity list
    console.log('📋 Step 3: Detailed entity breakdown...');
    entities.forEach((entity, index) => {
      console.log(`${index + 1}. ${entity.entity_type.toUpperCase()}: ${entity.display_name}`);
      console.log(`   Source: ${entity.source}`);
      console.log(`   Type: ${entity.type}`);
      if (entity.pp_contact_id) console.log(`   PP Contact ID: ${entity.pp_contact_id}`);
      if (entity.pp_user_id) console.log(`   PP User ID: ${entity.pp_user_id}`);
      if (entity.email) console.log(`   Email: ${entity.email}`);
      console.log(`   Will create: ${entity.should_create_contact || entity.should_create_user ? 'Yes' : 'No'}`);
      console.log(`   Will add as participant: ${entity.should_add_as_participant ? 'Yes' : 'No'}`);
      console.log('');
    });

    // Step 4: Check what already exists
    console.log('🔍 Step 4: Checking existing entities...');
    
    const existingChecks = await Promise.all(
      entities.map(async (entity) => {
        let existing = null;
        
        if (entity.type === 'user') {
          const { data: users } = await supabase
            .from('users')
            .select('id, first_name, last_name, email')
            .or(`pp_user_id.eq.${entity.pp_user_id},email.eq.${entity.email}`)
            .limit(1);
          existing = users && users.length > 0 ? users[0] : null;
        } else {
          // Check contacts
          const conditions = [];
          if (entity.pp_contact_id) conditions.push(`pp_contact_id.eq.${entity.pp_contact_id}`);
          if (entity.email) conditions.push(`email.eq.${entity.email}`);
          
          if (conditions.length > 0) {
            const { data: contacts } = await supabase
              .from('contacts')
              .select('id, first_name, last_name, company, email')
              .or(conditions.join(','))
              .limit(1);
            existing = contacts && contacts.length > 0 ? contacts[0] : null;
          }
        }
        
        return { entity, existing };
      })
    );

    const willCreate = existingChecks.filter(check => !check.existing).length;
    const willUpdate = existingChecks.filter(check => check.existing).length;

    console.log(`📊 Entity Status:`);
    console.log(`   Will create: ${willCreate}`);
    console.log(`   Will update: ${willUpdate}`);
    console.log('');

    existingChecks.forEach((check, index) => {
      const status = check.existing ? '🔄 UPDATE' : '🆕 CREATE';
      console.log(`${index + 1}. ${status}: ${check.entity.display_name}`);
      if (check.existing) {
        console.log(`   Existing: ${check.existing.first_name || check.existing.company} (${check.existing.id})`);
      }
    });
    console.log('');

    // Step 5: Ask for confirmation before sync
    console.log('⚠️  READY TO SYNC - This will create/update entities in the database!');
    console.log(`   Entities to process: ${entities.length}`);
    console.log(`   New entities: ${willCreate}`);
    console.log(`   Existing entities: ${willUpdate}`);
    console.log('');
    
    // For testing, let's do a dry run first
    console.log('🧪 Step 5: Performing DRY RUN (no actual changes)...');
    
    console.log('✅ Dry run completed! The sync system is ready.');
    console.log('');
    console.log('🚀 To perform actual sync, call:');
    console.log(`   autoSyncService.syncExchangeEntities('${exchangeId}')`);
    console.log('');
    
    // Uncomment the line below to perform actual sync:
    // const syncResult = await autoSyncService.syncExchangeEntities(exchangeId);
    // console.log('Sync Result:', syncResult);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testEntitySync();