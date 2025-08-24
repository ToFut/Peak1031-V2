/**
 * SAFE FORCE SYNC - Uses UPSERT to handle duplicates gracefully
 * Creates exchanges for missing PP matters without failing on duplicates
 */

const { createClient } = require('@supabase/supabase-js');
const PPTokenManager = require('./services/ppTokenManager');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const tokenManager = new PPTokenManager();

async function safeForceSyncAllMatters() {
  console.log('🚀 SAFE FORCE SYNC: Creating exchanges for ALL PP matters using UPSERT\n');
  
  try {
    // Get valid token
    const token = await tokenManager.getValidAccessToken();
    console.log('✅ PP token obtained\n');
    
    // Fetch ALL pages of matters
    let allMatters = [];
    let page = 1;
    let hasMore = true;
    
    console.log('📥 Fetching ALL pages of matters...');
    
    while (hasMore) {
      const config = {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { page, limit: 100 } // PP's max per page
      };
      
      const response = await axios.get('https://app.practicepanther.com/api/v2/matters', config);
      const matters = response.data || [];
      
      if (matters.length > 0) {
        allMatters = allMatters.concat(matters);
        console.log(`   📄 Page ${page}: ${matters.length} matters (Total: ${allMatters.length})`);
        hasMore = matters.length === 100; // Continue if we got full page
        page++;
      } else {
        hasMore = false;
      }
      
      // Safety break at reasonable limit
      if (page > 200) {
        console.log('⚠️ Safety limit reached at page 200');
        break;
      }
    }
    
    console.log(`\n✅ Fetched ${allMatters.length} total matters from PracticePanther`);
    
    // Check current database state
    const { count: beforeCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
      
    console.log(`\n📊 Current exchanges in database: ${beforeCount}`);
    console.log(`🎯 Processing ${allMatters.length} PP matters with UPSERT...`);
    
    // Create/update exchanges using UPSERT (no duplicates possible)
    let processed = 0;
    let created = 0;
    let updated = 0;
    let failed = 0;
    
    for (const matter of allMatters) {
      try {
        const exchangeData = {
          id: require('crypto').randomUUID(),
          pp_matter_id: matter.id,
          name: matter.display_name || matter.name || 'Untitled Exchange',
          exchange_name: matter.display_name || matter.name || 'Untitled Exchange',
          status: matter.status === 'Active' ? 'active' : 'draft',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // UPSERT: Insert if new, update if exists (based on pp_matter_id unique constraint)
        const { error, status } = await supabase
          .from('exchanges')
          .upsert(exchangeData, { 
            onConflict: 'pp_matter_id',
            ignoreDuplicates: false // This will update existing records
          });
          
        if (!error) {
          processed++;
          if (status === 201) created++;
          else if (status === 200) updated++;
          
          if (processed % 100 === 0) {
            console.log(`   ✅ Processed ${processed}/${allMatters.length} matters`);
          }
        } else {
          failed++;
          if (failed <= 5) { // Show first 5 errors only
            console.log(`   ❌ Failed to upsert PP matter ${matter.id}: ${error.message}`);
          }
        }
        
      } catch (error) {
        failed++;
        if (failed <= 5) {
          console.log(`   ❌ Error processing matter ${matter.id}: ${error.message}`);
        }
      }
    }
    
    // Final count
    const { count: afterCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n🎯 FINAL RESULTS:`);
    console.log(`- Total processed: ${processed}`);
    console.log(`- New exchanges created: ${created}`);  
    console.log(`- Existing updated: ${updated}`);
    console.log(`- Failed: ${failed}`);
    console.log(`- Database before: ${beforeCount} exchanges`);
    console.log(`- Database after: ${afterCount} exchanges`);
    console.log(`- Net increase: ${afterCount - beforeCount}`);
    console.log('\n🚀 Safe force sync completed!');
    
  } catch (error) {
    console.error('❌ Safe force sync failed:', error.message);
  }
}

// Run it
safeForceSyncAllMatters().then(() => process.exit(0));