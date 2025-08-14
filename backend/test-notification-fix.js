require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testNotificationFix() {
  console.log('🧪 Testing notification system fix...\n');

  try {
    // Test 1: Check if there are any recent messages with proper exchange_id
    console.log('1. Checking recent messages for exchange_id structure:');
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, content, exchange_id, sender_id, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesError) {
      console.log('❌ Error fetching messages:', messagesError.message);
    } else {
      console.log(`✅ Found ${messages?.length || 0} recent messages:`);
      messages?.forEach((msg, index) => {
        console.log(`   ${index + 1}. Message ID: ${msg.id}`);
        console.log(`      Exchange ID: ${msg.exchange_id || 'MISSING'}`);
        console.log(`      Content: ${msg.content?.substring(0, 50)}...`);
        console.log(`      Created: ${msg.created_at}`);
        console.log('');
      });
    }

    // Test 2: Check if there are any recent audit logs for message events
    console.log('2. Checking recent audit logs for message events:');
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('id, action, entity_type, entity_id, details, created_at')
      .eq('action', 'MESSAGE_SENT')
      .order('created_at', { ascending: false })
      .limit(5);

    if (auditError) {
      console.log('❌ Error fetching audit logs:', auditError.message);
    } else {
      console.log(`✅ Found ${auditLogs?.length || 0} message audit logs:`);
      auditLogs?.forEach((log, index) => {
        console.log(`   ${index + 1}. Action: ${log.action}`);
        console.log(`      Entity Type: ${log.entity_type}`);
        console.log(`      Entity ID: ${log.entity_id || 'MISSING'}`);
        console.log(`      Details: ${JSON.stringify(log.details)}`);
        console.log(`      Created: ${log.created_at}`);
        console.log('');
      });
    }

    // Test 3: Check exchange structure
    console.log('3. Checking exchange structure:');
    const { data: exchanges, error: exchangeError } = await supabase
      .from('exchanges')
      .select('id, name, status, created_at')
      .order('created_at', { ascending: false })
      .limit(3);

    if (exchangeError) {
      console.log('❌ Error fetching exchanges:', exchangeError.message);
    } else {
      console.log(`✅ Found ${exchanges?.length || 0} exchanges:`);
      exchanges?.forEach((exchange, index) => {
        console.log(`   ${index + 1}. Exchange ID: ${exchange.id}`);
        console.log(`      Name: ${exchange.name}`);
        console.log(`      Status: ${exchange.status}`);
        console.log(`      Created: ${exchange.created_at}`);
        console.log('');
      });
    }

    // Test 4: Simulate notification data structure
    console.log('4. Simulating notification data structure:');
    const testData = {
      exchangeId: 'test-exchange-id',
      exchange_id: 'test-exchange-id-snake',
      sender: { first_name: 'John', last_name: 'Doe' },
      content: 'Test message content'
    };

    console.log('   Test data with camelCase:', testData.exchangeId);
    console.log('   Test data with snake_case:', testData.exchange_id);
    console.log('   Fallback logic:', testData.exchangeId || testData.exchange_id);
    console.log('   This should work correctly now!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNotificationFix();








