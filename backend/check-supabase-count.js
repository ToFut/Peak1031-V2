#!/usr/bin/env node

const supabaseService = require('./services/supabase');

async function checkSupabaseCount() {
  if (!supabaseService.client) {
    console.log('❌ Supabase not configured');
    process.exit(1);
  }

  console.log('🔍 Checking Supabase exchanges table...');

  try {
    // Get exact count
    const countResult = await supabaseService.client
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 Total exchanges in Supabase:', countResult.count);
    
    // Get a few sample records
    const samplesResult = await supabaseService.client
      .from('exchanges')
      .select('id, name, exchange_number, status, created_at')
      .limit(5);
    
    if (samplesResult.error) {
      console.error('❌ Error fetching samples:', samplesResult.error);
    } else {
      console.log('📋 Sample exchanges:');
      samplesResult.data.forEach((ex, i) => {
        console.log(`  ${i+1}. ${ex.name || 'Unnamed'} (${ex.exchange_number || ex.id}) - Status: ${ex.status}`);
      });
    }

    // Check status distribution
    const statusResult = await supabaseService.client
      .from('exchanges')
      .select('status');
    
    if (!statusResult.error && statusResult.data) {
      const statusCounts = statusResult.data.reduce((acc, ex) => {
        acc[ex.status] = (acc[ex.status] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📈 Status distribution:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSupabaseCount();