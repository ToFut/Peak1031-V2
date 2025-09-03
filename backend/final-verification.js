#!/usr/bin/env node

/**
 * Final Verification of PP Sync and Entity Extraction
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
);

async function verifyCompletion() {
  console.log('=================================================');
  console.log('🔍 FINAL VERIFICATION REPORT');
  console.log('=================================================\n');
  
  // 1. PP Data Sync Status
  const { data: exchanges } = await supabase
    .from('exchanges')
    .select('id, name, pp_data, buyer_1_name, buyer_2_name')
    .not('pp_matter_id', 'is', null);
    
  const withCompleteData = exchanges.filter(ex => 
    ex.pp_data && Object.keys(ex.pp_data).length > 5
  );
  
  const withBuyerNames = exchanges.filter(ex => 
    ex.buyer_1_name || ex.buyer_2_name
  );
  
  console.log('📊 PP DATA SYNC STATUS:');
  console.log('─────────────────────────');
  console.log(`Total exchanges with PP matter ID: ${exchanges.length}`);
  console.log(`✅ With complete PP data: ${withCompleteData.length} (${(withCompleteData.length/exchanges.length*100).toFixed(1)}%)`);
  console.log(`✅ With extracted buyer names: ${withBuyerNames.length}`);
  console.log(`⏳ Still need sync: ${exchanges.length - withCompleteData.length}`);
  
  // 2. People/Contacts Created
  const { data: peopleCount } = await supabase
    .from('people')
    .select('id', { count: 'exact', head: true });
    
  const { data: byType } = await supabase
    .from('people')
    .select('contact_type')
    .not('contact_type', 'is', null);
    
  const typeCount = {};
  byType?.forEach(p => {
    typeCount[p.contact_type] = (typeCount[p.contact_type] || 0) + 1;
  });
  
  console.log('\n👥 PEOPLE EXTRACTION STATUS:');
  console.log('─────────────────────────');
  console.log(`Total people in database: ${peopleCount || 0}`);
  console.log('\nBreakdown by type:');
  Object.entries(typeCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  
  // 3. Check specific exchanges for clickable names
  const testExchanges = [
    '583d0041-bba7-4210-be65-519140eab358', // Wilson exchange
    'dd7c768d-ef72-4990-ae8c-56204772c514', // Greene exchange
    '273d2441-cebd-4c6a-9eb6-676e0b256510'  // Target exchange
  ];
  
  console.log('\n🔗 CLICKABLE NAMES TEST:');
  console.log('─────────────────────────');
  
  for (const id of testExchanges) {
    const { data: ex } = await supabase
      .from('exchanges')
      .select('name, buyer_1_name, buyer_2_name, rep_1_seller_1_name')
      .eq('id', id)
      .single();
      
    if (ex) {
      console.log(`\n${ex.name}:`);
      console.log(`  URL: http://localhost:3000/exchanges/${id}`);
      if (ex.buyer_1_name) console.log(`  ✅ Buyer 1: ${ex.buyer_1_name} (clickable)`);
      if (ex.buyer_2_name) console.log(`  ✅ Buyer 2: ${ex.buyer_2_name} (clickable)`);
      if (ex.rep_1_seller_1_name) console.log(`  ✅ Seller: ${ex.rep_1_seller_1_name} (clickable)`);
      if (!ex.buyer_1_name && !ex.buyer_2_name) console.log(`  ⏳ No names extracted yet`);
    }
  }
  
  // 4. Search functionality test
  console.log('\n🔍 SEARCHABLE PEOPLE:');
  console.log('─────────────────────────');
  
  const searchTests = ['Lev', 'Gonzalez', 'Bank'];
  for (const search of searchTests) {
    const { data: results } = await supabase
      .from('people')
      .select('first_name, last_name, contact_type')
      .or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,company.ilike.%${search}%`)
      .limit(3);
      
    console.log(`\nSearch "${search}": ${results?.length || 0} results`);
    results?.slice(0, 3).forEach(p => {
      console.log(`  - ${p.first_name} ${p.last_name} (${p.contact_type})`);
    });
  }
  
  // 5. Summary and recommendations
  console.log('\n=================================================');
  console.log('📋 SUMMARY & RECOMMENDATIONS');
  console.log('=================================================');
  
  const completionRate = (withCompleteData.length / exchanges.length * 100).toFixed(1);
  
  if (completionRate >= 90) {
    console.log('🎉 Excellent! Over 90% of exchanges have PP data');
  } else if (completionRate >= 50) {
    console.log('✅ Good progress! Over 50% of exchanges have PP data');
  } else {
    console.log('⏳ Sync in progress. Keep the sync script running.');
  }
  
  console.log('\n📌 Next Steps:');
  if (exchanges.length - withCompleteData.length > 0) {
    console.log(`1. Continue PP sync for remaining ${exchanges.length - withCompleteData.length} exchanges`);
  }
  console.log('2. Run entity extraction periodically as new data syncs');
  console.log('3. Test clickable names in exchange detail pages');
  console.log('4. Search for people in User Management (/admin/users)');
  
  console.log('\n✅ Verification complete!');
}

verifyCompletion().catch(console.error);