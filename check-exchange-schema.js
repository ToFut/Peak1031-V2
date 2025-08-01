require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSchema() {
  // Check exchanges table structure
  console.log('Checking exchanges table columns:');
  const { data: exchanges, error } = await supabase
    .from('exchanges')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else if (exchanges?.length > 0) {
    console.log('Exchange columns:', Object.keys(exchanges[0]));
    console.log('\nSample exchange:', exchanges[0]);
  }

  // Check messages with correct column names
  console.log('\n\nChecking exchanges with messages using correct columns:');
  const { data: exchangesWithMessages, error: ewmError } = await supabase
    .from('exchanges')
    .select(`
      id,
      name,
      status,
      messages (
        id,
        content,
        sender_id,
        created_at
      )
    `)
    .limit(3);
  
  if (ewmError) {
    console.error('Error:', ewmError);
  } else {
    console.log('✅ Exchanges with messages:', exchangesWithMessages?.length || 0);
    exchangesWithMessages?.forEach((exchange, i) => {
      console.log(`\nExchange ${i + 1}: ${exchange.name || 'Unnamed'}`);
      console.log(`  - Status: ${exchange.status}`);
      console.log(`  - Messages: ${exchange.messages?.length || 0}`);
      if (exchange.messages?.length > 0) {
        console.log(`  - Latest message: "${exchange.messages[0].content?.substring(0, 50)}..."`);
      }
    });
  }
}

checkSchema();