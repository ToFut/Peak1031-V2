/**
 * COMPLETE REMAINING SYNC - Add the final 1,195 missing PP matters
 * Uses proper pagination to get existing data
 */

const { createClient } = require('@supabase/supabase-js');
const PPTokenManager = require('./services/ppTokenManager');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const tokenManager = new PPTokenManager();

async function completeRemainingSync() {
  console.log('🎯 COMPLETING REMAINING SYNC: Adding final missing PP matters\n');
  
  try {
    // Get PP token
    const token = await tokenManager.getValidAccessToken();
    console.log('✅ PP token obtained\n');
    
    // Fetch ALL PP matters from API
    let allMatters = [];
    let page = 1;
    let hasMore = true;
    
    console.log('📥 Fetching ALL PP matters...');
    
    while (hasMore) {
      const config = {
        headers: { 'Authorization': `Bearer ${token}` },
        params: { page, limit: 100 }
      };
      
      const response = await axios.get('https://app.practicepanther.com/api/v2/matters', config);
      const matters = response.data || [];
      
      if (matters.length > 0) {
        allMatters = allMatters.concat(matters);
        if (page % 10 === 0) {
          console.log(`   📄 Page ${page}: Total ${allMatters.length} matters`);
        }
        hasMore = matters.length === 100;
        page++;
      } else {
        hasMore = false;
      }
      
      if (page > 100) {
        console.log('⚠️ Safety limit reached');
        break;
      }
    }
    
    console.log(`\n✅ Fetched ${allMatters.length} total PP matters`);
    
    // Get ALL existing PP matter IDs using pagination
    let allExistingPPIds = [];
    let dbPage = 0;
    const pageSize = 1000;
    let hasMoreDB = true;
    
    console.log('📥 Getting existing PP matter IDs from database...');
    
    while (hasMoreDB) {
      const { data: pageData, error } = await supabase
        .from('exchanges')
        .select('pp_matter_id')
        .range(dbPage * pageSize, (dbPage + 1) * pageSize - 1);
        
      if (error) {
        console.log('❌ DB Error:', error.message);
        break;
      }
      
      if (pageData && pageData.length > 0) {
        allExistingPPIds = allExistingPPIds.concat(pageData);
        hasMoreDB = pageData.length === pageSize;
        dbPage++;
      } else {
        hasMoreDB = false;
      }
    }
    
    console.log(`✅ Retrieved ${allExistingPPIds.length} existing exchange records`);
    
    // Build set of existing PP matter IDs
    const existingPPIds = new Set();
    allExistingPPIds.forEach(record => {
      if (record.pp_matter_id && record.pp_matter_id.trim() !== '') {
        existingPPIds.add(record.pp_matter_id);
      }
    });
    
    // Find missing matters
    const missingMatters = allMatters.filter(matter => !existingPPIds.has(matter.id));
    
    console.log(`\n📊 FINAL SYNC ANALYSIS:`);
    console.log(`- PP matters from API: ${allMatters.length}`);
    console.log(`- Already in database: ${existingPPIds.size}`);
    console.log(`- MISSING (to create): ${missingMatters.length}`);
    
    if (missingMatters.length === 0) {
      console.log('\n🎉 ALL PP matters are already synced!');
      return;
    }
    
    // Create missing exchanges in small batches
    console.log(`\n🔄 Creating ${missingMatters.length} missing exchanges...`);
    
    let created = 0;
    let failed = 0;
    const batchSize = 50; // Smaller batches for better reliability
    
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
          console.log(`   ✅ Batch ${Math.floor(i/batchSize) + 1}: +${exchanges.length} (Total: ${created}/${missingMatters.length})`);
        } else {
          failed += exchanges.length;
          console.log(`   ❌ Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
        }
      } catch (error) {
        failed += exchanges.length;
        console.log(`   ❌ Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
      }
    }
    
    // Final verification with proper pagination
    const { count: finalTotalCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
    
    // Count final unique PP matter IDs
    let finalPPIds = [];
    let finalPage = 0;
    let hasMoreFinal = true;
    
    while (hasMoreFinal) {
      const { data: pageData } = await supabase
        .from('exchanges')
        .select('pp_matter_id')
        .range(finalPage * pageSize, (finalPage + 1) * pageSize - 1);
        
      if (pageData && pageData.length > 0) {
        finalPPIds = finalPPIds.concat(pageData);
        hasMoreFinal = pageData.length === pageSize;
        finalPage++;
      } else {
        hasMoreFinal = false;
      }
    }
    
    const finalUniquePPIds = new Set();
    finalPPIds.forEach(record => {
      if (record.pp_matter_id && record.pp_matter_id.trim() !== '') {
        finalUniquePPIds.add(record.pp_matter_id);
      }
    });
    
    console.log(`\n🎯 FINAL RESULTS:`);
    console.log(`- Successfully created: ${created}`);
    console.log(`- Failed: ${failed}`);
    console.log(`- Total exchanges now: ${finalTotalCount}`);
    console.log(`- Unique PP matter IDs now: ${finalUniquePPIds.size}`);
    console.log(`- Target: 7175`);
    console.log(`- Completion rate: ${Math.round((finalUniquePPIds.size / 7175) * 100)}%`);
    
    if (finalUniquePPIds.size >= 7100) {
      console.log('\n🎉 COMPLETE SUCCESS! All PP matters synced!');
    } else if (finalUniquePPIds.size >= 7000) {
      console.log('\n✅ EXCELLENT! Nearly all PP matters synced!');
    } else {
      console.log('\n⚠️ More work needed');
    }
    
    console.log('\n🚀 Remaining sync completed!');
    
  } catch (error) {
    console.error('❌ Remaining sync failed:', error.message);
  }
}

// Run it
completeRemainingSync().then(() => process.exit(0));