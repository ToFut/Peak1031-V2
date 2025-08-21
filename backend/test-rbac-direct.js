const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function testRBACDirect() {
  console.log('🔍 Testing RBAC Service Directly');
  console.log('================================');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Step 1: Get the admin user
    console.log('\n👤 Step 1: Getting admin user...');
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, role')
      .eq('email', 'admin@peak1031.com')
      .single();
    
    if (adminError || !adminUser) {
      console.error('❌ Admin user not found:', adminError);
      return;
    }
    
    console.log(`✅ Found admin user: ${adminUser.email} (${adminUser.id}) - Role: ${adminUser.role}`);

    // Step 2: Test direct Supabase query (what admin should see)
    console.log('\n📋 Step 2: Testing direct Supabase query...');
    const { data: allExchanges, error: allExchangesError } = await supabase
      .from('exchanges')
      .select('id, name, status, is_active')
      .limit(5);
    
    if (allExchangesError) {
      console.error('❌ Error fetching all exchanges:', allExchangesError);
    } else {
      console.log(`✅ Direct query found ${allExchanges.length} exchanges:`);
      allExchanges.forEach(exchange => {
        console.log(`   - ${exchange.name} (${exchange.status}) - Active: ${exchange.is_active}`);
      });
    }

    // Step 3: Test the exact RBAC query logic
    console.log('\n🔒 Step 3: Testing RBAC query logic...');
    
    // This is the exact logic from RBAC service for admin users
    let query = supabase.from('exchanges').select('*', { count: 'exact' });
    
    // For admin users, no filter should be applied
    console.log('   ✓ Admin access granted - no filters');
    
    const { data: rbacExchanges, error: rbacError } = await query;
    
    if (rbacError) {
      console.error('❌ RBAC query error:', rbacError);
    } else {
      console.log(`✅ RBAC query found ${rbacExchanges.length} exchanges`);
    }

    // Step 4: Test with limit and pagination
    console.log('\n📄 Step 4: Testing with limit and pagination...');
    const { data: limitedExchanges, error: limitedError } = await supabase
      .from('exchanges')
      .select('id, name, status')
      .limit(10)
      .order('created_at', { ascending: false });
    
    if (limitedError) {
      console.error('❌ Limited query error:', limitedError);
    } else {
      console.log(`✅ Limited query found ${limitedExchanges.length} exchanges:`);
      limitedExchanges.forEach(exchange => {
        console.log(`   - ${exchange.name} (${exchange.status})`);
      });
    }

    // Step 5: Check if there are any active exchanges
    console.log('\n✅ Step 5: Checking active exchanges...');
    const { data: activeExchanges, error: activeError } = await supabase
      .from('exchanges')
      .select('id, name, status')
      .eq('is_active', true)
      .limit(5);
    
    if (activeError) {
      console.error('❌ Active exchanges query error:', activeError);
    } else {
      console.log(`✅ Found ${activeExchanges.length} active exchanges:`);
      activeExchanges.forEach(exchange => {
        console.log(`   - ${exchange.name} (${exchange.status})`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testRBACDirect().then(() => {
  console.log('\n✅ RBAC test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
