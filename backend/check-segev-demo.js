const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkSegevDemo() {
  try {
    // Search for SEGEV DEMO exchange
    const { data: exchanges, error } = await supabase
      .from('exchanges')
      .select('*')
      .or('exchange_number.ilike.%SEGEV%,client_name.ilike.%SEGEV%,notes.ilike.%SEGEV%')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log('Found exchanges with SEGEV:', exchanges.length);
    
    exchanges.forEach(ex => {
      console.log('\n=== EXCHANGE DETAILS ===');
      console.log('ID:', ex.id);
      console.log('Exchange Number:', ex.exchange_number);
      console.log('Status:', ex.status);
      console.log('Client Name:', ex.client_name);
      console.log('QI Name:', ex.qi_name);
      console.log('Created:', new Date(ex.created_at).toLocaleString());
      
      // Count filled fields
      const fields = Object.entries(ex);
      const filledFields = fields.filter(([key, value]) => {
        return value !== null && value !== '' && value !== undefined;
      });
      
      console.log('\nFields with data:', filledFields.length, 'out of', fields.length);
      
      // Show all non-null fields
      console.log('\nAll data fields:');
      filledFields.forEach(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          console.log(`  - ${key}:`, JSON.stringify(value, null, 2));
        } else {
          console.log(`  - ${key}:`, value);
        }
      });
    });
    
    // Also check for all exchanges to see the full picture
    console.log('\n\n=== ALL EXCHANGES SUMMARY ===');
    const { data: allExchanges, error: allError } = await supabase
      .from('exchanges')
      .select('id, exchange_number, status, client_name, created_at')
      .order('created_at', { ascending: false });
    
    if (!allError && allExchanges) {
      console.log('\nAll exchanges in database:');
      allExchanges.forEach(ex => {
        console.log(`- ${ex.exchange_number || 'NO NUMBER'} | ${ex.client_name || 'NO CLIENT'} | ${ex.status || 'NO STATUS'} | Created: ${new Date(ex.created_at).toLocaleDateString()}`);
      });
      console.log('\nTotal exchanges:', allExchanges.length);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkSegevDemo();