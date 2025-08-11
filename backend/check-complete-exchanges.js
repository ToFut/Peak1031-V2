const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkExchanges() {
  try {
    // Get all exchanges with their details
    const { data: exchanges, error } = await supabase
      .from('exchanges')
      .select(`
        id,
        exchange_number,
        status,
        created_at,
        relinquished_property_address,
        relinquished_property_value,
        replacement_property_address,
        replacement_property_value,
        qi_name,
        client_name,
        coordinator_id,
        assigned_users
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log('Total exchanges:', exchanges.length);
    console.log('\nExchanges with complete information:\n');
    
    exchanges.forEach(ex => {
      const hasRelinquishedInfo = ex.relinquished_property_address && ex.relinquished_property_value;
      const hasReplacementInfo = ex.replacement_property_address && ex.replacement_property_value;
      const hasQI = ex.qi_name;
      const hasClient = ex.client_name;
      const hasCoordinator = ex.coordinator_id;
      
      const completeness = [];
      if (hasRelinquishedInfo) completeness.push('Relinquished');
      if (hasReplacementInfo) completeness.push('Replacement');
      if (hasQI) completeness.push('QI');
      if (hasClient) completeness.push('Client');
      if (hasCoordinator) completeness.push('Coordinator');
      
      const isComplete = hasRelinquishedInfo && hasReplacementInfo && hasQI && hasClient;
      
      if (isComplete) {
        console.log(`✓ Exchange #${ex.exchange_number}:`);
        console.log(`  - Status: ${ex.status}`);
        console.log(`  - Client: ${ex.client_name}`);
        console.log(`  - QI: ${ex.qi_name}`);
        console.log(`  - Relinquished: ${ex.relinquished_property_address} ($${ex.relinquished_property_value?.toLocaleString()})`);
        console.log(`  - Replacement: ${ex.replacement_property_address} ($${ex.replacement_property_value?.toLocaleString()})`);
        console.log('');
      }
    });
    
    console.log('\nExchanges with partial information:\n');
    
    exchanges.forEach(ex => {
      const hasRelinquishedInfo = ex.relinquished_property_address && ex.relinquished_property_value;
      const hasReplacementInfo = ex.replacement_property_address && ex.replacement_property_value;
      const hasQI = ex.qi_name;
      const hasClient = ex.client_name;
      
      const completeness = [];
      if (hasRelinquishedInfo) completeness.push('Relinquished');
      if (hasReplacementInfo) completeness.push('Replacement');
      if (hasQI) completeness.push('QI');
      if (hasClient) completeness.push('Client');
      
      const isPartial = completeness.length > 0 && completeness.length < 4;
      
      if (isPartial) {
        console.log(`⚠ Exchange #${ex.exchange_number}:`);
        console.log(`  - Status: ${ex.status}`);
        console.log(`  - Has: ${completeness.join(', ')}`);
        console.log(`  - Missing: ${
          [
            !hasRelinquishedInfo && 'Relinquished info',
            !hasReplacementInfo && 'Replacement info',
            !hasQI && 'QI',
            !hasClient && 'Client'
          ].filter(Boolean).join(', ')
        }`);
        console.log('');
      }
    });
    
    // Summary
    const complete = exchanges.filter(ex => {
      return ex.relinquished_property_address && ex.relinquished_property_value &&
             ex.replacement_property_address && ex.replacement_property_value &&
             ex.qi_name && ex.client_name;
    });
    
    const partial = exchanges.filter(ex => {
      const hasAny = ex.relinquished_property_address || ex.relinquished_property_value ||
                     ex.replacement_property_address || ex.replacement_property_value ||
                     ex.qi_name || ex.client_name;
      const hasAll = ex.relinquished_property_address && ex.relinquished_property_value &&
                     ex.replacement_property_address && ex.replacement_property_value &&
                     ex.qi_name && ex.client_name;
      return hasAny && !hasAll;
    });
    
    const empty = exchanges.filter(ex => {
      return !ex.relinquished_property_address && !ex.relinquished_property_value &&
             !ex.replacement_property_address && !ex.replacement_property_value &&
             !ex.qi_name && !ex.client_name;
    });
    
    console.log('\n=== SUMMARY ===');
    console.log(`Complete exchanges: ${complete.length}`);
    console.log(`Partial exchanges: ${partial.length}`);
    console.log(`Empty exchanges: ${empty.length}`);
    console.log(`Total: ${exchanges.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkExchanges();