const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkExchangeParticipantsSchema() {
  console.log('🔍 Checking exchange_participants table schema...\n');

  try {
    // Try to query the table with all columns
    const { data, error } = await supabase
      .from('exchange_participants')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error accessing exchange_participants:', error.message);
      console.log('\n📋 The table might not exist or has access issues.');
    } else {
      console.log('✅ Table exists and is accessible');
      
      if (data && data.length > 0) {
        console.log('\n📊 Column structure:');
        const columns = Object.keys(data[0]);
        columns.forEach(col => {
          const value = data[0][col];
          const type = value === null ? 'NULL' : typeof value;
          console.log(`  - ${col}: ${type}`);
        });
      } else {
        console.log('\n📊 Table is empty, trying to get schema another way...');
        
        // Try with a specific select to see what columns exist
        const { data: schemaTest, error: schemaError } = await supabase
          .from('exchange_participants')
          .select('id, exchange_id, person_id, user_id, contact_id, role')
          .limit(1);
          
        if (schemaError) {
          console.log('⚠️ Some columns might not exist:', schemaError.message);
          console.log('\nTrying minimal columns...');
          
          const { data: minimalTest, error: minimalError } = await supabase
            .from('exchange_participants')
            .select('id, exchange_id')
            .limit(1);
            
          if (!minimalError) {
            console.log('✅ Basic columns (id, exchange_id) exist');
          }
        } else {
          console.log('✅ Standard columns exist');
        }
      }
    }
    
    // Also check exchanges table structure for reference
    console.log('\n🔍 Checking exchanges table for participant references...');
    const { data: exchangeData, error: exchangeError } = await supabase
      .from('exchanges')
      .select('id, clientId, coordinatorId')
      .limit(1);
      
    if (!exchangeError && exchangeData) {
      console.log('✅ Exchanges table has clientId and coordinatorId columns');
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err);
  }
}

checkExchangeParticipantsSchema();