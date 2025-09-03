#!/usr/bin/env node

/**
 * Complete Full PP Sync with Auto Token Management
 * This script will sync ALL exchanges with PP data and handle token issues
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const PracticePartnerService = require('./services/practicePartnerService');
const PPTokenManager = require('./services/ppTokenManager');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
);

const ppService = new PracticePartnerService();
const tokenManager = new PPTokenManager();

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ensureValidToken() {
  const status = await tokenManager.getTokenStatus();
  console.log(`🔑 Token status: ${status.status}`);
  
  if (!status.isValid) {
    console.log('⚠️ Token expired or invalid, attempting to refresh...');
    
    // Try to get a valid token
    try {
      const token = await tokenManager.getValidAccessToken();
      if (token) {
        console.log('✅ Token refreshed successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to refresh token:', error.message);
      
      // Try manual token refresh if available
      if (status.has_refresh_token) {
        console.log('🔄 Attempting manual refresh with refresh token...');
        const refreshed = await tokenManager.manualRefresh();
        if (refreshed) {
          console.log('✅ Token manually refreshed');
          return true;
        }
      }
      
      console.log('\n❌ Cannot continue without valid token');
      console.log('Please manually refresh token in PracticePanther OAuth settings');
      return false;
    }
  }
  
  return true;
}

async function syncBatch(exchanges, startIdx, batchSize) {
  const batch = exchanges.slice(startIdx, Math.min(startIdx + batchSize, exchanges.length));
  if (batch.length === 0) return { success: 0, failed: 0 };
  
  console.log(`\n📦 Processing batch: ${startIdx + 1}-${startIdx + batch.length} of ${exchanges.length}`);
  
  let success = 0;
  let failed = 0;
  
  for (const exchange of batch) {
    try {
      // Ensure token is valid before each API call
      const tokenValid = await ensureValidToken();
      if (!tokenValid) {
        console.log('⚠️ Stopping due to token issues');
        return { success, failed: batch.length - success, stopped: true };
      }
      
      // Fetch complete matter details
      const completeMatter = await ppService.fetchMatterDetails(exchange.pp_matter_id);
      
      // Transform data
      const transformedData = ppService.transformMatter(completeMatter);
      
      // Update exchange
      const { error } = await supabase
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
          buyer_1_name: transformedData.buyer_1_name,
          buyer_2_name: transformedData.buyer_2_name,
          rep_1_seller_1_name: transformedData.rep_1_seller_1_name,
          rep_1_seller_2_name: transformedData.rep_1_seller_2_name,
          last_sync_at: new Date().toISOString()
        })
        .eq('id', exchange.id);
        
      if (!error) {
        success++;
        console.log(`  ✅ [${startIdx + batch.indexOf(exchange) + 1}/${exchanges.length}] ${exchange.name}`);
      } else {
        failed++;
        console.log(`  ❌ [${startIdx + batch.indexOf(exchange) + 1}/${exchanges.length}] ${exchange.name}: ${error.message}`);
      }
      
      // Rate limiting
      await sleep(500); // 0.5 second between requests
      
    } catch (error) {
      failed++;
      console.log(`  ❌ API Error: ${error.message}`);
      
      if (error.message.includes('429')) {
        console.log('  ⏳ Rate limit hit, waiting 30 seconds...');
        await sleep(30000);
      }
    }
  }
  
  return { success, failed };
}

async function runCompleteSync() {
  console.log('=================================================');
  console.log('🚀 COMPLETE PRACTICEPANTHER DATA SYNC');
  console.log('=================================================\n');
  
  // Get all exchanges needing sync
  const { data: allExchanges } = await supabase
    .from('exchanges')
    .select('id, name, pp_matter_id, pp_data')
    .not('pp_matter_id', 'is', null)
    .order('created_at', { ascending: true });
    
  // Filter exchanges that need PP data
  const needSync = allExchanges.filter(ex => 
    !ex.pp_data || 
    typeof ex.pp_data !== 'object' || 
    Object.keys(ex.pp_data).length < 5
  );
  
  console.log(`📊 Status:`);
  console.log(`  - Total exchanges: ${allExchanges.length}`);
  console.log(`  - Already synced: ${allExchanges.length - needSync.length}`);
  console.log(`  - Need sync: ${needSync.length}`);
  
  if (needSync.length === 0) {
    console.log('\n✅ All exchanges already have PP data!');
    return;
  }
  
  // Process in batches
  const batchSize = 20;
  let totalSuccess = 0;
  let totalFailed = 0;
  
  for (let i = 0; i < needSync.length; i += batchSize) {
    const result = await syncBatch(needSync, i, batchSize);
    totalSuccess += result.success;
    totalFailed += result.failed;
    
    if (result.stopped) {
      console.log('\n⚠️ Sync stopped due to token issues');
      break;
    }
    
    // Progress update
    console.log(`📊 Progress: ${totalSuccess}/${needSync.length} synced, ${totalFailed} failed`);
    
    // Take a break between batches
    if (i + batchSize < needSync.length) {
      console.log('⏳ Waiting 2 seconds before next batch...');
      await sleep(2000);
    }
  }
  
  // Final summary
  console.log('\n=================================================');
  console.log('📊 FINAL SYNC SUMMARY');
  console.log('=================================================');
  console.log(`✅ Successfully synced: ${totalSuccess}`);
  console.log(`❌ Failed: ${totalFailed}`);
  
  // Verify final status
  const { data: finalCheck } = await supabase
    .from('exchanges')
    .select('pp_data')
    .not('pp_matter_id', 'is', null);
    
  const withData = finalCheck.filter(ex => 
    ex.pp_data && Object.keys(ex.pp_data).length > 5
  );
  
  console.log(`\n📋 Final Status: ${withData.length}/${finalCheck.length} exchanges have complete PP data`);
  
  if (withData.length === finalCheck.length) {
    console.log('🎉 All exchanges successfully synced!');
  } else {
    console.log(`⚠️ ${finalCheck.length - withData.length} exchanges still need sync`);
  }
}

// Add manual token refresh method if needed
PPTokenManager.prototype.manualRefresh = async function() {
  try {
    const { data: tokenData } = await this.supabase
      .from('pp_oauth_tokens')
      .select('*')
      .single();
      
    if (!tokenData || !tokenData.refresh_token) {
      return false;
    }
    
    // Attempt refresh using stored refresh token
    const response = await fetch('https://app.practicepanther.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
        client_id: process.env.PP_CLIENT_ID,
        client_secret: process.env.PP_CLIENT_SECRET
      })
    });
    
    if (response.ok) {
      const newToken = await response.json();
      
      // Update stored token
      await this.supabase
        .from('pp_oauth_tokens')
        .update({
          access_token: newToken.access_token,
          refresh_token: newToken.refresh_token || tokenData.refresh_token,
          expires_at: new Date(Date.now() + (newToken.expires_in * 1000)).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', tokenData.id);
        
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Manual refresh failed:', error.message);
    return false;
  }
};

// Run the complete sync
runCompleteSync().then(() => {
  console.log('\n✅ Sync process completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});