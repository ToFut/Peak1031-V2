#!/usr/bin/env node

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkExchanges() {
  try {
    console.log('🔍 Checking exchanges in database...');
    
    // Check how many exchanges are actually in the database
    const { data: exchanges, error } = await supabase
      .from('exchanges')
      .select('id, name, exchange_name, status, created_at')
      .limit(10);
      
    if (error) {
      console.log('❌ Error fetching exchanges:', error.message);
      return;
    }
    
    console.log('📋 Sample exchanges in database:', exchanges.length);
    exchanges.forEach((ex, i) => {
      console.log(`  ${i+1}. ${ex.name || ex.exchange_name} (${ex.status})`);
    });
    
    // Get total count
    const { count, error: countError } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
      
    if (!countError) {
      console.log('\n📊 Total exchanges in database:', count);
    } else {
      console.log('❌ Error getting count:', countError.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkExchanges();