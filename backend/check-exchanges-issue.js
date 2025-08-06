const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkExchangesIssue() {
  console.log('🔍 Investigating why exchanges appear as 0...\n');
  console.log('=' .repeat(50));

  try {
    // 1. Try different ways to count exchanges
    console.log('\n1️⃣ Trying to count exchanges...');
    
    // Method 1: Using count aggregate
    const { count: count1, error: error1 } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
    
    if (error1) {
      console.log('❌ Error with count method:', error1.message);
    } else {
      console.log(`✅ Count method shows: ${count1} exchanges`);
    }

    // Method 2: Select with limit
    console.log('\n2️⃣ Trying to fetch exchanges with different queries...');
    
    const { data: exchanges1, error: error2 } = await supabase
      .from('exchanges')
      .select('id, exchangeName, status')
      .limit(5);
    
    if (error2) {
      console.log('❌ Error with basic select:', error2.message);
    } else if (exchanges1) {
      console.log(`✅ Basic select found ${exchanges1.length} exchanges (limited to 5)`);
      if (exchanges1.length > 0) {
        console.log('   Sample exchanges:');
        exchanges1.forEach(e => {
          console.log(`   - ${e.exchangeName || e.id} (${e.status})`);
        });
      }
    }

    // Method 3: Try with different column names (case sensitivity)
    console.log('\n3️⃣ Checking column name case sensitivity...');
    
    const { data: exchanges2, error: error3 } = await supabase
      .from('exchanges')
      .select('id, "exchangeName", status')
      .limit(3);
    
    if (error3) {
      console.log('❌ Error with quoted columns:', error3.message);
    } else if (exchanges2) {
      console.log(`✅ Quoted column query found ${exchanges2.length} exchanges`);
    }

    // Method 4: Check all column names
    console.log('\n4️⃣ Getting actual column names...');
    
    const { data: sampleExchange, error: error4 } = await supabase
      .from('exchanges')
      .select('*')
      .limit(1)
      .single();
    
    if (!error4 && sampleExchange) {
      const columns = Object.keys(sampleExchange);
      console.log('✅ Exchange table columns:');
      console.log('   Available columns:', columns.slice(0, 10).join(', '), '...');
      
      // Check for the exchangeName column specifically
      const hasExchangeName = columns.includes('exchangeName');
      const hasExchange_name = columns.includes('exchange_name');
      const hasName = columns.includes('name');
      
      console.log(`\n   Column variations:`);
      console.log(`   - exchangeName: ${hasExchangeName ? '✅' : '❌'}`);
      console.log(`   - exchange_name: ${hasExchange_name ? '✅' : '❌'}`);
      console.log(`   - name: ${hasName ? '✅' : '❌'}`);
    }

    // Method 5: Try without any column specification
    console.log('\n5️⃣ Fetching without column specification...');
    
    const { data: exchanges3, error: error5 } = await supabase
      .from('exchanges')
      .select()
      .limit(3);
    
    if (error5) {
      console.log('❌ Error with default select:', error5.message);
    } else if (exchanges3) {
      console.log(`✅ Default select found ${exchanges3.length} exchanges`);
      if (exchanges3.length > 0) {
        const firstExchange = exchanges3[0];
        console.log('\n   First exchange details:');
        console.log(`   - ID: ${firstExchange.id}`);
        console.log(`   - Status: ${firstExchange.status}`);
        console.log(`   - Created: ${new Date(firstExchange.created_at || firstExchange.createdAt).toLocaleDateString()}`);
      }
    }

    // Method 6: Check RLS policies
    console.log('\n6️⃣ Checking if RLS might be blocking access...');
    
    // This uses service key, so should bypass RLS
    const { data: rlsCheck, error: rlsError } = await supabase
      .from('exchanges')
      .select('id')
      .limit(1);
    
    if (rlsError) {
      console.log('⚠️ Even service key has issues:', rlsError.message);
    } else if (rlsCheck && rlsCheck.length > 0) {
      console.log('✅ Service key can access exchanges (RLS is not the issue)');
    }

    // Final summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 DIAGNOSIS SUMMARY:');
    
    if (!error1 && count1 > 0) {
      console.log(`✅ Database has ${count1} exchanges`);
      console.log('✅ The exchanges exist and are accessible');
      console.log('\n⚠️ The issue in the previous test was likely:');
      console.log('   - Column name mismatch (exchangeName vs exchange_name)');
      console.log('   - Or a temporary connection issue');
    } else {
      console.log('⚠️ There might be an issue with:');
      console.log('   - Database connection');
      console.log('   - Table permissions');
      console.log('   - Column names');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkExchangesIssue();