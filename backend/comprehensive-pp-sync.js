#!/usr/bin/env node

/**
 * Comprehensive PracticePanther Data Sync Script
 * 
 * This script fetches complete PP matter data for ALL exchanges that have pp_matter_id
 * and stores the full data including custom_field_values in pp_data column
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

async function syncAllExchangesWithPPData() {
  console.log('=================================================');
  console.log('🔄 COMPREHENSIVE PRACTICEPANTHER DATA SYNC');
  console.log('=================================================\n');
  
  try {
    // Step 1: Get all exchanges with pp_matter_id
    const { data: exchanges, error: fetchError } = await supabase
      .from('exchanges')
      .select('id, pp_matter_id, name, pp_data')
      .not('pp_matter_id', 'is', null)
      .order('created_at', { ascending: true });
      
    if (fetchError) {
      console.error('❌ Error fetching exchanges:', fetchError);
      return;
    }
    
    console.log(`📊 Found ${exchanges.length} exchanges with pp_matter_id\n`);
    
    // Track statistics
    const stats = {
      total: exchanges.length,
      successful: 0,
      failed: 0,
      alreadyComplete: 0,
      errors: []
    };
    
    // Step 2: Process each exchange
    for (let i = 0; i < exchanges.length; i++) {
      const exchange = exchanges[i];
      
      // Check if already has complete data
      const hasCompleteData = exchange.pp_data && 
                             typeof exchange.pp_data === 'object' && 
                             Object.keys(exchange.pp_data).length > 5 &&
                             exchange.pp_data.custom_field_values;
      
      if (hasCompleteData) {
        console.log(`✅ [${i+1}/${exchanges.length}] Exchange ${exchange.id} already has complete PP data (${Object.keys(exchange.pp_data).length} keys)`);
        stats.alreadyComplete++;
        continue;
      }
      
      console.log(`🔍 [${i+1}/${exchanges.length}] Fetching PP data for exchange ${exchange.id} (Matter: ${exchange.pp_matter_id})`);
      console.log(`   Current data: ${exchange.pp_data ? Object.keys(exchange.pp_data).length : 0} keys`);
      
      try {
        // Fetch complete matter details from PP API
        const completeMatter = await ppService.fetchMatterDetails(exchange.pp_matter_id);
        
        // Extract key information for logging
        const customFieldCount = completeMatter.custom_field_values?.length || 0;
        const assignedUsersCount = completeMatter.assigned_to_users?.length || 0;
        const participantsCount = completeMatter.participants?.length || 0;
        
        console.log(`   ✓ Fetched complete data: ${Object.keys(completeMatter).length} keys`);
        console.log(`     - Custom fields: ${customFieldCount}`);
        console.log(`     - Assigned users: ${assignedUsersCount}`);
        console.log(`     - Participants: ${participantsCount}`);
        
        // Transform the complete matter data
        const transformedData = ppService.transformMatter(completeMatter);
        
        // Update the exchange with complete PP data and transformed fields
        const { data: updatedExchange, error: updateError } = await supabase
          .from('exchanges')
          .update({
            pp_data: completeMatter, // Store complete PP response
            pp_raw_data: completeMatter, // Also store as backup
            
            // Update mapped fields from PP data
            pp_display_name: transformedData.pp_display_name,
            pp_matter_number: transformedData.pp_matter_number,
            pp_matter_status: transformedData.pp_matter_status,
            pp_responsible_attorney: transformedData.pp_responsible_attorney,
            
            // Update custom field mappings
            type_of_exchange: transformedData.type_of_exchange,
            client_vesting: transformedData.client_vesting,
            bank: transformedData.bank,
            proceeds: transformedData.proceeds,
            day_45: transformedData.day_45,
            day_180: transformedData.day_180,
            rel_property_address: transformedData.rel_property_address,
            rel_value: transformedData.rel_value,
            rel_apn: transformedData.rel_apn,
            rel_escrow_number: transformedData.rel_escrow_number,
            rel_contract_date: transformedData.rel_contract_date,
            close_of_escrow_date: transformedData.close_of_escrow_date,
            rep_1_property_address: transformedData.rep_1_property_address,
            rep_1_value: transformedData.rep_1_value,
            rep_1_apn: transformedData.rep_1_apn,
            rep_1_escrow_number: transformedData.rep_1_escrow_number,
            rep_1_purchase_contract_date: transformedData.rep_1_purchase_contract_date,
            rep_1_seller_1_name: transformedData.rep_1_seller_1_name,
            rep_1_seller_2_name: transformedData.rep_1_seller_2_name,
            buyer_1_name: transformedData.buyer_1_name,
            buyer_2_name: transformedData.buyer_2_name,
            
            last_sync_at: new Date().toISOString()
          })
          .eq('id', exchange.id)
          .select()
          .single();
          
        if (updateError) {
          console.error(`   ❌ Error updating exchange:`, updateError.message);
          stats.failed++;
          stats.errors.push({ exchange_id: exchange.id, error: updateError.message });
        } else {
          console.log(`   ✅ Successfully updated exchange with complete PP data\n`);
          stats.successful++;
        }
        
        // Rate limiting - PP allows 300 requests per 5 minutes
        // We'll be conservative and do 1 request per second
        await sleep(1000);
        
      } catch (apiError) {
        console.error(`   ❌ Error fetching PP data:`, apiError.message);
        stats.failed++;
        stats.errors.push({ exchange_id: exchange.id, error: apiError.message });
        
        // If it's a rate limit error, wait longer
        if (apiError.message.includes('429') || apiError.message.includes('rate')) {
          console.log('   ⏳ Rate limit hit, waiting 30 seconds...');
          await sleep(30000);
        } else {
          // Regular error, just wait a bit
          await sleep(2000);
        }
      }
    }
    
    // Step 3: Print summary
    console.log('\n=================================================');
    console.log('📊 SYNC SUMMARY');
    console.log('=================================================');
    console.log(`Total exchanges processed: ${stats.total}`);
    console.log(`✅ Successfully synced: ${stats.successful}`);
    console.log(`✓ Already had complete data: ${stats.alreadyComplete}`);
    console.log(`❌ Failed: ${stats.failed}`);
    
    if (stats.errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      stats.errors.forEach((err, idx) => {
        console.log(`  ${idx + 1}. Exchange ${err.exchange_id}: ${err.error}`);
      });
    }
    
    // Step 4: Verify the sync
    console.log('\n🔍 Verifying sync results...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('exchanges')
      .select('id, pp_data')
      .not('pp_matter_id', 'is', null);
      
    if (!verifyError && verifyData) {
      const withCompleteData = verifyData.filter(ex => 
        ex.pp_data && 
        typeof ex.pp_data === 'object' && 
        Object.keys(ex.pp_data).length > 5
      );
      
      console.log(`\n✅ Verification: ${withCompleteData.length}/${verifyData.length} exchanges now have complete PP data`);
      
      // Show a sample of the data
      if (withCompleteData.length > 0) {
        const sample = withCompleteData[0];
        console.log(`\n📋 Sample PP data structure (Exchange ${sample.id}):`);
        console.log(`  - Keys: ${Object.keys(sample.pp_data).join(', ').substring(0, 100)}...`);
        console.log(`  - Custom fields: ${sample.pp_data.custom_field_values?.length || 0}`);
        console.log(`  - Assigned users: ${sample.pp_data.assigned_to_users?.length || 0}`);
      }
    }
    
    console.log('\n✅ Comprehensive PP sync completed!');
    
  } catch (error) {
    console.error('❌ Fatal error during sync:', error);
  }
}

// Run the sync
console.log('🚀 Starting comprehensive PracticePanther data sync...\n');
syncAllExchangesWithPPData().then(() => {
  console.log('\n👋 Sync process finished');
  process.exit(0);
}).catch(error => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});