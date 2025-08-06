#!/usr/bin/env node

/**
 * Check the exchange table schema
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkExchangeSchema() {
  console.log('🔍 Checking exchange table schema...\n');

  try {
    // Get a sample exchange to see the structure
    const { data: exchanges, error } = await supabase
      .from('exchanges')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error:', error);
      return;
    }

    if (exchanges && exchanges.length > 0) {
      console.log('Exchange table columns:');
      Object.keys(exchanges[0]).forEach(col => {
        console.log(`  - ${col}`);
      });
    } else {
      console.log('No exchanges found. Checking table structure differently...');
      
      // Try to insert a test record to see what fields are required/available
      console.log('\nTrying to understand table structure...');
    }

    // Check total count
    const { count } = await supabase
      .from('exchanges')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\nTotal exchanges in database: ${count || 0}`);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkExchangeSchema();