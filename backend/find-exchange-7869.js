require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findExchange7869() {
  console.log('🔍 Finding exchange 7869 for easy access...\n');

  try {
    // Search by name containing 7869
    const { data: exchanges } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_id, status, created_at')
      .ilike('name', '%7869%')
      .limit(10);

    if (exchanges && exchanges.length > 0) {
      console.log(`📋 Found ${exchanges.length} exchange(s) with "7869" in name:\n`);
      
      exchanges.forEach((ex, index) => {
        console.log(`${index + 1}. ${ex.name}`);
        console.log(`   ID: ${ex.id}`);
        console.log(`   PP Matter ID: ${ex.pp_matter_id}`);
        console.log(`   Status: ${ex.status}`);
        console.log(`   Link: http://localhost:3000/exchanges/${ex.id}`);
        
        if (ex.id === 'e00bfb0f-df96-438e-98f0-87ef91b708a7') {
          console.log(`   ⭐ THIS IS OUR TARGET EXCHANGE WITH PP DATA!`);
        }
        console.log('');
      });

      // Check if our target is in the list
      const targetExchange = exchanges.find(ex => ex.id === 'e00bfb0f-df96-438e-98f0-87ef91b708a7');
      
      if (targetExchange) {
        console.log('🎯 TARGET EXCHANGE FOUND!');
        console.log('=' .repeat(50));
        console.log(`Direct Link: http://localhost:3000/exchanges/${targetExchange.id}`);
        console.log('This exchange has all the PracticePanther data we synced!');
      } else {
        console.log('⚠️ Target exchange not found in search results');
        console.log('Trying direct ID lookup...');
        
        const { data: direct } = await supabase
          .from('exchanges')
          .select('id, name, pp_matter_id, status')
          .eq('id', 'e00bfb0f-df96-438e-98f0-87ef91b708a7')
          .single();
        
        if (direct) {
          console.log('✅ Found by direct ID lookup:');
          console.log(`   Name: ${direct.name}`);
          console.log(`   PP Matter ID: ${direct.pp_matter_id}`);
          console.log(`   Link: http://localhost:3000/exchanges/${direct.id}`);
        }
      }
      
    } else {
      console.log('❌ No exchanges found with "7869" in name');
    }

    console.log('\n📝 HOW TO ACCESS:');
    console.log('1. Go to: http://localhost:3000');
    console.log('2. Login if needed');
    console.log('3. Search for "7869" or "Kicelian" or "London Green"');
    console.log('4. Or use direct link above');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findExchange7869();