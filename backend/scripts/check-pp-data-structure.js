#!/usr/bin/env node

/**
 * Script to check PracticePanther data structure in exchanges
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkPPData() {
  console.log('🔍 Checking PracticePanther data structure...\n');

  try {
    // Get a sample exchange with PP data
    const { data: exchanges, error } = await supabase
      .from('exchanges')
      .select('id, name, pp_matter_id, pp_data')
      .not('pp_data', 'is', null)
      .limit(3);

    if (error) throw error;

    console.log(`Found ${exchanges.length} exchanges with PP data\n`);

    exchanges.forEach((exchange, idx) => {
      console.log(`\n${idx + 1}. Exchange: ${exchange.name}`);
      console.log(`   PP Matter ID: ${exchange.pp_matter_id}`);
      
      if (exchange.pp_data) {
        console.log('   PP Data structure:');
        console.log('   - Keys:', Object.keys(exchange.pp_data));
        
        // Show client info if exists
        if (exchange.pp_data.client) {
          console.log('   - Client info:', JSON.stringify(exchange.pp_data.client, null, 2));
        }
        
        // Show contact info if exists  
        if (exchange.pp_data.contact) {
          console.log('   - Contact info:', JSON.stringify(exchange.pp_data.contact, null, 2));
        }
        
        // Show first level of pp_data
        console.log('   - Full structure sample:', JSON.stringify(exchange.pp_data, null, 2).substring(0, 500) + '...');
      }
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

checkPPData();