#!/usr/bin/env node

/**
 * Run Entity Extraction for All Exchanges with PP Data
 * 
 * This script extracts entities from PP data and creates contacts/users
 * with proper exchange references
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const entityExtractor = require('./services/entityExtractionService');
const autoSyncService = require('./services/autoSyncService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
);

async function runEntityExtraction() {
  console.log('=================================================');
  console.log('🔄 RUNNING ENTITY EXTRACTION FOR ALL EXCHANGES');
  console.log('=================================================\n');
  
  try {
    // Get all exchanges with PP data
    const { data: exchanges, error: fetchError } = await supabase
      .from('exchanges')
      .select('id, name, pp_data, pp_matter_id')
      .not('pp_data', 'is', null)
      .order('created_at', { ascending: true });
      
    if (fetchError) {
      console.error('❌ Error fetching exchanges:', fetchError);
      return;
    }
    
    // Filter exchanges that have actual PP data
    const withPPData = exchanges.filter(ex => 
      ex.pp_data && 
      typeof ex.pp_data === 'object' && 
      Object.keys(ex.pp_data).length > 5
    );
    
    console.log(`📊 Found ${withPPData.length} exchanges with PP data\n`);
    
    const stats = {
      processed: 0,
      entitiesExtracted: 0,
      contactsCreated: 0,
      errors: []
    };
    
    // Process each exchange
    for (const exchange of withPPData) {
      stats.processed++;
      console.log(`\n[${stats.processed}/${withPPData.length}] Processing exchange: ${exchange.name || exchange.id}`);
      
      try {
        // Extract entities from PP data
        const entities = entityExtractor.extractEntitiesFromExchange(exchange);
        console.log(`   📋 Extracted ${entities.length} entities`);
        stats.entitiesExtracted += entities.length;
        
        if (entities.length > 0) {
          // Show entity summary
          const types = {};
          entities.forEach(e => {
            types[e.contactType] = (types[e.contactType] || 0) + 1;
          });
          console.log(`   📊 Entity types:`, Object.entries(types).map(([k,v]) => `${k}: ${v}`).join(', '));
          
          // Sync entities to database
          const syncResult = await autoSyncService.syncExchangeEntities(exchange.id);
          
          if (syncResult.success) {
            console.log(`   ✅ Successfully synced ${syncResult.created} new, ${syncResult.updated} updated contacts`);
            stats.contactsCreated += syncResult.created;
            
            // Show sample of created contacts
            if (syncResult.contacts && syncResult.contacts.length > 0) {
              const sample = syncResult.contacts.slice(0, 3);
              sample.forEach(contact => {
                console.log(`      - ${contact.full_name} (${contact.contact_type})`);
              });
              if (syncResult.contacts.length > 3) {
                console.log(`      ... and ${syncResult.contacts.length - 3} more`);
              }
            }
          } else {
            console.log(`   ⚠️ Sync completed with warnings:`, syncResult.message);
          }
        } else {
          console.log(`   ℹ️ No entities to extract from this exchange`);
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing exchange:`, error.message);
        stats.errors.push({ exchange_id: exchange.id, error: error.message });
      }
    }
    
    // Print summary
    console.log('\n=================================================');
    console.log('📊 ENTITY EXTRACTION SUMMARY');
    console.log('=================================================');
    console.log(`Exchanges processed: ${stats.processed}`);
    console.log(`Total entities extracted: ${stats.entitiesExtracted}`);
    console.log(`New contacts created: ${stats.contactsCreated}`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. Exchange ${err.exchange_id}: ${err.error}`);
      });
    }
    
    // Verify results
    console.log('\n🔍 Verifying extraction results...');
    
    // Check people table
    const { data: peopleCount } = await supabase
      .from('people')
      .select('id', { count: 'exact' });
      
    console.log(`\n✅ Total contacts in people table: ${peopleCount?.length || 0}`);
    
    // Check sample of contacts with exchange assignments
    const { data: sampleContacts } = await supabase
      .from('people')
      .select('full_name, contact_type, assigned_exchanges')
      .not('assigned_exchanges', 'is', null)
      .limit(5);
      
    if (sampleContacts && sampleContacts.length > 0) {
      console.log('\n📋 Sample contacts with exchange assignments:');
      sampleContacts.forEach(contact => {
        const exchangeCount = contact.assigned_exchanges?.length || 0;
        console.log(`  - ${contact.full_name} (${contact.contact_type}): ${exchangeCount} exchanges`);
      });
    }
    
    console.log('\n✅ Entity extraction completed successfully!');
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the extraction
console.log('🚀 Starting entity extraction process...\n');
runEntityExtraction().then(() => {
  console.log('\n👋 Process finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Process failed:', error);
  process.exit(1);
});