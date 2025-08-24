/**
 * SIMPLE MATTER SYNC - Insert missing PP matters as exchanges using correct schema
 * Uses only columns that exist in the current database
 */

const { createClient } = require('@supabase/supabase-js');
const PPTokenManager = require('./services/ppTokenManager');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const tokenManager = new PPTokenManager();

async function simpleMatterSync() {
  console.log('🚀 SIMPLE MATTER SYNC: Creating missing exchanges from PP matters\n');
  
  try {
    // Get valid token
    const token = await tokenManager.getValidAccessToken();
    console.log('✅ PP token obtained\n');
    
    // Fetch ALL pages of matters from PP
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
        console.log(`   📄 Page ${page}: ${matters.length} matters (Total: ${allMatters.length})`);
        hasMore = matters.length === 100;
        page++;
      } else {
        hasMore = false;
      }
      
      if (page > 200) {
        console.log('⚠️ Safety limit reached');
        break;
      }
    }
    
    console.log(`\n✅ Fetched ${allMatters.length} total matters from PP`);
    
    // Get existing PP matter IDs
    const { data: existingIds } = await supabase
      .from('exchanges')
      .select('pp_matter_id')
      .not('pp_matter_id', 'is', null);
      
    const existingSet = new Set(existingIds?.map(r => r.pp_matter_id) || []);
    const missingMatters = allMatters.filter(matter => !existingSet.has(matter.id));
    
    console.log(`\n📊 Analysis:`);
    console.log(`- PP matters fetched: ${allMatters.length}`);
    console.log(`- Already in database: ${existingSet.size}`);
    console.log(`- MISSING from database: ${missingMatters.length}`);
    
    if (missingMatters.length === 0) {
      console.log('\n🎉 All PP matters are already synced!');
      return;
    }
    
    // Insert missing matters using minimal schema (only required columns)
    console.log(`\n🔄 Creating ${missingMatters.length} missing exchanges...`);
    
    let created = 0;
    let failed = 0;
    
    for (const matter of missingMatters) {
      try {
        // Use minimal data that matches actual database schema
        const exchangeData = {
          id: require('crypto').randomUUID(),
          pp_matter_id: matter.id,
          name: matter.display_name || matter.name || `PP Matter ${matter.id}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('exchanges')
          .insert(exchangeData);
          
        if (!error) {
          created++;
          if (created % 500 === 0) {
            console.log(`   ✅ Created ${created}/${missingMatters.length} exchanges`);
          }
        } else {
          failed++;
          if (failed <= 5) {
            console.log(`   ❌ Failed: ${error.message}`);
          }
        }
        
      } catch (error) {
        failed++;
        if (failed <= 5) {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }
    
    // Final verification
    const { count: finalCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
    
    const { data: finalPPIds } = await supabase
      .from('exchanges')
      .select('pp_matter_id')
      .not('pp_matter_id', 'is', null);
    
    const finalUniqueSet = new Set(finalPPIds?.map(r => r.pp_matter_id) || []);
    
    console.log(`\n🎯 FINAL RESULTS:`);
    console.log(`- Successfully created: ${created}`);
    console.log(`- Failed: ${failed}`);
    console.log(`- Total exchanges now: ${finalCount}`);
    console.log(`- Unique PP matter IDs now: ${finalUniqueSet.size}`);
    console.log(`- Should be close to: 7175`);
    console.log('\n🚀 Simple matter sync completed!');
    
  } catch (error) {
    console.error('❌ Simple sync failed:', error.message);
  }
}

// Run it
simpleMatterSync().then(() => process.exit(0));