const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkExchanges() {
  try {
    // Get all exchanges
    const { data: exchanges, error } = await supabase
      .from('exchanges')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    console.log('Total exchanges in database:', exchanges.length);
    
    // Check the schema from first exchange
    if (exchanges.length > 0) {
      console.log('\nAvailable columns:');
      console.log(Object.keys(exchanges[0]).join(', '));
    }
    
    console.log('\n=== ALL EXCHANGES ===\n');
    
    exchanges.forEach(ex => {
      // Count non-null fields
      const filledFields = Object.entries(ex).filter(([key, value]) => {
        return value !== null && value !== '' && value !== undefined;
      });
      
      console.log(`Exchange: ${ex.exchange_number || 'NO NUMBER'}`);
      console.log(`  ID: ${ex.id}`);
      console.log(`  Status: ${ex.status || 'not set'}`);
      console.log(`  Created: ${new Date(ex.created_at).toLocaleDateString()}`);
      console.log(`  Fields with data: ${filledFields.length}/${Object.keys(ex).length}`);
      
      // Show key fields if they exist
      if (ex.participants) {
        console.log(`  Participants: ${JSON.stringify(ex.participants)}`);
      }
      if (ex.properties) {
        console.log(`  Properties: ${JSON.stringify(ex.properties)}`);
      }
      if (ex.timeline) {
        console.log(`  Timeline: ${JSON.stringify(ex.timeline)}`);
      }
      
      // Look for SEGEV in any field
      const hasSegev = Object.entries(ex).some(([key, value]) => {
        if (typeof value === 'string') {
          return value.toUpperCase().includes('SEGEV');
        }
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value).toUpperCase().includes('SEGEV');
        }
        return false;
      });
      
      if (hasSegev) {
        console.log('  *** Contains SEGEV reference ***');
      }
      
      console.log('');
    });
    
    // Look specifically for SEGEV DEMO
    const segevExchanges = exchanges.filter(ex => {
      return Object.entries(ex).some(([key, value]) => {
        if (typeof value === 'string') {
          return value.toUpperCase().includes('SEGEV');
        }
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value).toUpperCase().includes('SEGEV');
        }
        return false;
      });
    });
    
    console.log('\n=== EXCHANGES WITH SEGEV ===');
    console.log(`Found ${segevExchanges.length} exchanges with SEGEV reference`);
    
    if (segevExchanges.length > 0) {
      segevExchanges.forEach(ex => {
        console.log('\nFull details for SEGEV exchange:');
        Object.entries(ex).forEach(([key, value]) => {
          if (value !== null && value !== '' && value !== undefined) {
            console.log(`  ${key}:`, typeof value === 'object' ? JSON.stringify(value, null, 2) : value);
          }
        });
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkExchanges();