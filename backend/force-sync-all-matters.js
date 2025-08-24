/**
 * FORCE SYNC ALL PP MATTERS - No limits, no pagination issues
 * Directly fetches ALL 7,175 matters and creates missing exchanges
 */

const { createClient } = require('@supabase/supabase-js');
const PPTokenManager = require('./services/ppTokenManager');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const tokenManager = new PPTokenManager();

async function forceSync() {
  console.log('🚀 FORCE SYNC: Getting ALL PP matters with NO LIMITS\n');
  
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
    
    console.log(`\\n✅ Fetched ${allMatters.length} total matters from PracticePanther`);
    
    // Check which ones are missing from our database
    const { data: existingIds } = await supabase
      .from('exchanges')
      .select('pp_matter_id')
      .not('pp_matter_id', 'is', null);
      
    const existingSet = new Set(existingIds?.map(r => r.pp_matter_id) || []);
    const missingMatters = allMatters.filter(matter => !existingSet.has(matter.id));
    
    console.log(`\\n📊 Analysis:`);
    console.log(`- PP matters fetched: ${allMatters.length}`);
    console.log(`- Already in database: ${existingSet.size}`);
    console.log(`- MISSING from database: ${missingMatters.length}`);
    
    if (missingMatters.length === 0) {
      console.log('\\n🎉 All PP matters are already synced!');
      return;
    }
    
    // Create exchanges for missing matters
    console.log(`\\n🔄 Creating ${missingMatters.length} missing exchanges...`);
    
    let created = 0;
    for (const matter of missingMatters) {
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
        
        const { error } = await supabase
          .from('exchanges')
          .insert(exchangeData);
          
        if (!error) {
          created++;
          if (created % 100 === 0) {
            console.log(`   ✅ Created ${created}/${missingMatters.length} exchanges`);
          }
        } else {
          console.log(`   ❌ Failed to create exchange for PP matter ${matter.id}: ${error.message}`);
        }
        
      } catch (error) {
        console.log(`   ❌ Error processing matter ${matter.id}: ${error.message}`);
      }
    }
    
    console.log(`\\n🎯 FINAL RESULTS:`);
    console.log(`- Successfully created: ${created} new exchanges`);
    console.log(`- Failed: ${missingMatters.length - created}`);
    
    // Verify final count
    const { count: finalCount } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
      
    console.log(`- Total exchanges now: ${finalCount}`);
    console.log('\\n🚀 Force sync completed!');
    
  } catch (error) {
    console.error('❌ Force sync failed:', error.message);
  }
}

// Run it
forceSync().then(() => process.exit(0));