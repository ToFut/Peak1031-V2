#!/usr/bin/env node

const supabaseService = require('./services/supabase');

async function debugExchanges() {
  console.log('🔍 Debug exchanges count discrepancy...');

  try {
    // Direct Supabase query
    console.log('\n1. Direct Supabase query:');
    const directResult = await supabaseService.client
      .from('exchanges')
      .select('*', { count: 'exact' })
      .limit(5000);
    
    console.log(`   Total in Supabase: ${directResult.count}`);
    console.log(`   Returned by query: ${directResult.data?.length || 0}`);

    // Through getExchanges method
    console.log('\n2. Through getExchanges method:');
    const serviceResult = await supabaseService.getExchanges({ limit: 5000 });
    console.log(`   Returned by service: ${serviceResult?.length || 0}`);

    // Check if there are any filters being applied
    if (directResult.data && serviceResult) {
      const statusCounts = directResult.data.reduce((acc, ex) => {
        acc[ex.status] = (acc[ex.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n3. Status distribution (direct query):');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });

      const serviceStatusCounts = serviceResult.reduce((acc, ex) => {
        acc[ex.status] = (acc[ex.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n4. Status distribution (service method):');
      Object.entries(serviceStatusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugExchanges();