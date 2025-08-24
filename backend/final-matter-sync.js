/**
 * FINAL MATTER SYNC - The definitive solution
 * Only creates exchanges for PP matters that truly don't exist
 */

const { createClient } = require('@supabase/supabase-js');
const PPTokenManager = require('./services/ppTokenManager');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const tokenManager = new PPTokenManager();

async function finalMatterSync() {
  console.log('🎯 FINAL MATTER SYNC: Creating ALL missing PP matters as exchanges\n');
  
  try {
    // Get PP token
    const token = await tokenManager.getValidAccessToken();
    console.log('✅ PP token obtained\n');
    
    // Fetch ALL PP matters
    let allMatters = [];
    let page = 1;
    let hasMore = true;
    
    console.log('📥 Fetching ALL PP matters (unlimited pages)...');
    
    while (hasMore) {
      const config = {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { page, limit: 100 }
      };
      
      const response = await axios.get('https://app.practicepanther.com/api/v2/matters', config);
      const matters = response.data || [];
      
      if (matters.length > 0) {
        allMatters = allMatters.concat(matters);
        console.log(`   📄 Page ${page}: ${matters.length} matters (Total: ${allMatters.length})`);
        hasMore = matters.length === 100;
        page++;
      } else {
        hasMore = false;
      }
      
      if (page > 100) { // Safety limit
        console.log('⚠️ Safety limit reached at page 100');
        break;
      }
    }
    
    console.log(`\n✅ Fetched ${allMatters.length} total matters from PP`);
    
    // Get ALL existing PP matter IDs (not just non-null)
    const { data: allExchanges } = await supabase
      .from('exchanges')
      .select('pp_matter_id')
      .limit(10000); // Get all records
      
    console.log(`📊 Retrieved ${allExchanges?.length || 0} exchange records from database`);
    
    // Filter out null/empty and create set
    const existingPPIds = new Set();
    allExchanges?.forEach(record => {
      if (record.pp_matter_id && record.pp_matter_id.trim() !== '') {
        existingPPIds.add(record.pp_matter_id);
      }
    });
    
    console.log(`🔍 Found ${existingPPIds.size} existing PP matter IDs in database`);
    
    // Find truly missing matters
    const missingMatters = allMatters.filter(matter => !existingPPIds.has(matter.id));
    
    console.log(`\n📊 SYNC ANALYSIS:`);
    console.log(`- PP matters from API: ${allMatters.length}`);
    console.log(`- Already in database: ${existingPPIds.size}`);
    console.log(`- MISSING (to create): ${missingMatters.length}`);
    
    if (missingMatters.length === 0) {
      console.log('\n🎉 All PP matters are already synced!');
      return;
    }
    
    // Create missing exchanges in batches
    console.log(`\n🔄 Creating ${missingMatters.length} missing exchanges...`);
    
    let created = 0;
    let failed = 0;
    const batchSize = 100;
    
    for (let i = 0; i < missingMatters.length; i += batchSize) {
      const batch = missingMatters.slice(i, i + batchSize);
      const exchanges = batch.map(matter => ({
        id: require('crypto').randomUUID(),
        pp_matter_id: matter.id,
        name: matter.display_name || matter.name || `PP Matter ${matter.id}`,
        status: 'draft',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      try {
        const { error } = await supabase
          .from('exchanges')
          .insert(exchanges);
          
        if (!error) {
          created += exchanges.length;
          console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: Created ${exchanges.length} exchanges (Total: ${created})`);
        } else {
          failed += exchanges.length;
          console.log(`   ❌ Batch ${Math.floor(i/batchSize) + 1} failed: ${error.message}`);
        }
      } catch (error) {
        failed += exchanges.length;
        console.log(`   ❌ Batch ${Math.floor(i/batchSize) + 1} error: ${error.message}`);
      }
    }
    
    // Final verification
    const { count: finalCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
    
    const { data: finalPPIds } = await supabase
      .from('exchanges')
      .select('pp_matter_id')
      .not('pp_matter_id', 'is', null)
      .limit(10000);
    
    const finalUnique = new Set();
    finalPPIds?.forEach(record => {
      if (record.pp_matter_id && record.pp_matter_id.trim() !== '') {
        finalUnique.add(record.pp_matter_id);
      }
    });
    
    console.log(`\n🎯 FINAL RESULTS:`);
    console.log(`- Successfully created: ${created}`);
    console.log(`- Failed: ${failed}`);
    console.log(`- Total exchanges now: ${finalCount}`);
    console.log(`- Unique PP matter IDs now: ${finalUnique.size}`);
    console.log(`- Expected target: 7175`);
    console.log(`- Success rate: ${finalUnique.size >= 7000 ? '✅ SUCCESS!' : '⚠️ Partial'}`);
    console.log('\n🚀 Final matter sync completed!');
    
  } catch (error) {
    console.error('❌ Final sync failed:', error.message);
  }
}

// Run it
finalMatterSync().then(() => process.exit(0));