#!/usr/bin/env node

/**
 * Sync specific exchange with PP data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const PracticePartnerService = require('./services/practicePartnerService');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_API_KEY
);

const ppService = new PracticePartnerService();

async function syncSpecificExchange(exchangeId) {
  console.log(`🔄 Syncing exchange ${exchangeId}...`);
  
  // Get the exchange
  const { data: exchange, error } = await supabase
    .from('exchanges')
    .select('*')
    .eq('id', exchangeId)
    .single();
    
  if (error || !exchange) {
    console.error('Exchange not found:', error);
    return;
  }
  
  console.log(`Found: ${exchange.name}`);
  console.log(`PP Matter ID: ${exchange.pp_matter_id}`);
  console.log(`Current PP data keys: ${exchange.pp_data ? Object.keys(exchange.pp_data).length : 0}`);
  
  if (!exchange.pp_matter_id) {
    console.log('❌ No PP matter ID');
    return;
  }
  
  // Fetch complete PP data
  console.log('\n🔍 Fetching PP data...');
  const completeMatter = await ppService.fetchMatterDetails(exchange.pp_matter_id);
  
  console.log(`✅ Fetched ${Object.keys(completeMatter).length} keys`);
  console.log(`Custom fields: ${completeMatter.custom_field_values?.length || 0}`);
  console.log(`Assigned users: ${completeMatter.assigned_to_users?.length || 0}`);
  
  // Transform and update
  const transformedData = ppService.transformMatter(completeMatter);
  
  const { error: updateError } = await supabase
    .from('exchanges')
    .update({
      pp_data: completeMatter,
      pp_raw_data: completeMatter,
      pp_display_name: transformedData.pp_display_name,
      pp_matter_number: transformedData.pp_matter_number,
      pp_matter_status: transformedData.pp_matter_status,
      pp_responsible_attorney: transformedData.pp_responsible_attorney,
      buyer_1_name: transformedData.buyer_1_name,
      buyer_2_name: transformedData.buyer_2_name,
      last_sync_at: new Date().toISOString()
    })
    .eq('id', exchangeId);
    
  if (updateError) {
    console.error('Update error:', updateError);
  } else {
    console.log('✅ Exchange updated successfully!');
  }
}

// Run for the target exchange
syncSpecificExchange('273d2441-cebd-4c6a-9eb6-676e0b256510').then(() => {
  console.log('✅ Done');
  process.exit(0);
}).catch(error => {
  console.error('Error:', error);
  process.exit(1);
});