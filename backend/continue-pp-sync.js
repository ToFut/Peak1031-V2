#!/usr/bin/env node

/**
 * Continue PracticePanther Data Sync Script
 * Continues from where the last sync left off
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const PracticePartnerService = require('./services/practicePartnerService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
);

const ppService = new PracticePartnerService();

// Rate limiting helper
async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function continueSync(batchSize = 100, startOffset = 0) {
  console.log('=================================================');
  console.log(`🔄 CONTINUING PP SYNC - Batch of ${batchSize} starting at offset ${startOffset}`);
  console.log('=================================================\n');
  
  try {
    // Get exchanges that still need syncing (pp_data is empty or minimal)
    const { data: exchanges, error: fetchError } = await supabase
      .from('exchanges')
      .select('id, pp_matter_id, name, pp_data')
      .not('pp_matter_id', 'is', null)
      .order('created_at', { ascending: true })
      .range(startOffset, startOffset + batchSize - 1);
      
    if (fetchError) {
      console.error('❌ Error fetching exchanges:', fetchError);
      return;
    }
    
    // Filter to only exchanges that need syncing
    const needsSync = exchanges.filter(ex => 
      !ex.pp_data || 
      typeof ex.pp_data !== 'object' || 
      Object.keys(ex.pp_data).length < 5 ||
      !ex.pp_data.custom_field_values
    );
    
    console.log(`📊 Found ${needsSync.length} exchanges needing sync in this batch\n`);
    
    if (needsSync.length === 0) {
      console.log('✅ All exchanges in this batch already have complete data!');
      return { completed: exchanges.length, needsMore: exchanges.length === batchSize };
    }
    
    // Track statistics
    const stats = {
      processed: 0,
      successful: 0,
      failed: 0
    };
    
    // Process each exchange
    for (const exchange of needsSync) {
      stats.processed++;
      console.log(`🔍 [${stats.processed}/${needsSync.length}] Syncing exchange ${exchange.id} (Matter: ${exchange.pp_matter_id})`);
      
      try {
        // Fetch complete matter details from PP API
        const completeMatter = await ppService.fetchMatterDetails(exchange.pp_matter_id);
        
        const customFieldCount = completeMatter.custom_field_values?.length || 0;
        console.log(`   ✓ Fetched ${Object.keys(completeMatter).length} keys, ${customFieldCount} custom fields`);
        
        // Transform the complete matter data
        const transformedData = ppService.transformMatter(completeMatter);
        
        // Update the exchange with complete PP data
        const { error: updateError } = await supabase
          .from('exchanges')
          .update({
            pp_data: completeMatter,
            pp_raw_data: completeMatter,
            pp_display_name: transformedData.pp_display_name,
            pp_matter_number: transformedData.pp_matter_number,
            pp_matter_status: transformedData.pp_matter_status,
            pp_responsible_attorney: transformedData.pp_responsible_attorney,
            type_of_exchange: transformedData.type_of_exchange,
            client_vesting: transformedData.client_vesting,
            bank: transformedData.bank,
            proceeds: transformedData.proceeds,
            day_45: transformedData.day_45,
            day_180: transformedData.day_180,
            rel_property_address: transformedData.rel_property_address,
            rel_value: transformedData.rel_value,
            buyer_1_name: transformedData.buyer_1_name,
            buyer_2_name: transformedData.buyer_2_name,
            last_sync_at: new Date().toISOString()
          })
          .eq('id', exchange.id);
          
        if (updateError) {
          console.error(`   ❌ Error updating:`, updateError.message);
          stats.failed++;
        } else {
          console.log(`   ✅ Successfully updated\n`);
          stats.successful++;
        }
        
        // Rate limiting
        await sleep(1000);
        
      } catch (apiError) {
        console.error(`   ❌ Error:`, apiError.message);
        stats.failed++;
        
        if (apiError.message.includes('429')) {
          console.log('   ⏳ Rate limit hit, waiting 30 seconds...');
          await sleep(30000);
        } else {
          await sleep(2000);
        }
      }
    }
    
    console.log('\n📊 Batch Summary:');
    console.log(`✅ Successful: ${stats.successful}`);
    console.log(`❌ Failed: ${stats.failed}`);
    
    return { 
      completed: exchanges.length, 
      needsMore: exchanges.length === batchSize,
      stats
    };
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    return { completed: 0, needsMore: false, error };
  }
}

// Check current sync status first
async function checkSyncStatus() {
  const { data: summary } = await supabase
    .from('exchanges')
    .select('pp_data')
    .not('pp_matter_id', 'is', null);
    
  const withData = summary.filter(ex => 
    ex.pp_data && 
    typeof ex.pp_data === 'object' && 
    Object.keys(ex.pp_data).length > 5
  );
  
  console.log(`\n📊 Current Status: ${withData.length}/${summary.length} exchanges have PP data\n`);
  return { total: summary.length, synced: withData.length };
}

// Main execution
async function main() {
  const status = await checkSyncStatus();
  
  if (status.synced >= status.total) {
    console.log('✅ All exchanges already synced!');
    return;
  }
  
  // Start from where we likely left off (around 505)
  const startOffset = 505;
  const batchSize = 100;
  
  const result = await continueSync(batchSize, startOffset);
  
  if (result.needsMore) {
    console.log(`\n📋 Batch completed. Run again with offset ${startOffset + batchSize} to continue.`);
  } else {
    console.log('\n✅ Sync completed for this range!');
  }
  
  // Final status
  await checkSyncStatus();
}

main().then(() => {
  console.log('\n👋 Process finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Failed:', error);
  process.exit(1);
});