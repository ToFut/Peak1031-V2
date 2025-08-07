const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixMessagesTable() {
  try {
    console.log('🔧 Checking and fixing messages table...\n');
    
    // Check if users exist
    const testUsers = [
      'd3af6a77-6766-435f-8313-a3be252f269f', // admin
      '5d8cd54b-9eee-4d76-878b-3694e6665775', // client
      '8f6261ea-8e06-4877-ab5c-95ab9ab6488b', // coordinator
      '8b470c17-9433-45e5-be8e-2b14beb82a70'  // thirdparty
    ];
    
    for (const userId of testUsers) {
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('id', userId);
      
      if (error) {
        console.log(`❌ Error checking user ${userId}:`, error.message);
      } else if (!data || data.length === 0) {
        console.log(`⚠️  User ${userId} not found in users table`);
      } else {
        console.log(`✅ User found: ${data[0].email}`);
      }
    }
    
    console.log('\n📝 Testing with a simple message insert using system user...\n');
    
    // Try to find any valid user ID from the users table
    const { data: anyUser, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (anyUser && anyUser.length > 0) {
      console.log(`🔍 Found a valid user: ${anyUser[0].email} (${anyUser[0].id})`);
      
      // Try to insert a test message
      const testMessage = {
        content: 'Test message from system',
        exchange_id: '8330bc7a-269d-4216-a22c-fd9657eca87c',
        sender_id: anyUser[0].id,
        message_type: 'text',
        created_at: new Date().toISOString(),
        read_by: []
      };
      
      const { data: msgData, error: msgError } = await supabase
        .from('messages')
        .insert([testMessage])
        .select();
      
      if (msgError) {
        console.error('❌ Still cannot insert message:', msgError.message);
        
        // Check if it's the exchange that doesn't exist
        const { data: exchangeCheck } = await supabase
          .from('exchanges')
          .select('id')
          .eq('id', testMessage.exchange_id);
        
        if (!exchangeCheck || exchangeCheck.length === 0) {
          console.log('⚠️  Exchange does not exist!');
        }
      } else {
        console.log('✅ Test message inserted successfully!');
        console.log('   Message ID:', msgData[0].id);
      }
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

fixMessagesTable();