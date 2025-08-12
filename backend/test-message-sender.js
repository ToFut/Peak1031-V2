/**
 * Test script to check message sender information
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const testMessageSender = async () => {
  try {
    console.log('🧪 Testing message sender information...');
    
    const targetExchangeId = 'ba7865ac-da20-404a-b609-804d15cb0467';
    
    // Test 1: Get messages first without joins
    console.log('\n📋 Test 1: Getting messages without joins...');
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('exchange_id', targetExchangeId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log('❌ Error getting messages:', error.message);
      return;
    }
    
    const messageCount = messages ? messages.length : 0;
    console.log(`📊 Found ${messageCount} messages`);
    
    if (messages && messages.length > 0) {
      messages.forEach((msg, idx) => {
        console.log(`\n📧 Message ${idx + 1}:`);
        const contentPreview = msg.content ? msg.content.substring(0, 50) + '...' : 'No content';
        console.log('  - Content:', contentPreview);
        console.log('  - Sender ID:', msg.sender_id);
        
        if (msg.sender) {
          const senderName = msg.sender.full_name || 
                           (msg.sender.first_name && msg.sender.last_name ? 
                            `${msg.sender.first_name} ${msg.sender.last_name}` : 
                            'Unknown');
          console.log('  - Sender Info:', {
            name: senderName,
            email: msg.sender.email,
            role: msg.sender.role
          });
        } else {
          console.log('  - Sender Info: No sender data');
        }
      });
    }
    
    // Test 2: Check people table directly for sender IDs
    console.log('\n📋 Test 2: Checking people table for sender IDs...');
    if (messages && messages.length > 0) {
      const senderIds = [...new Set(messages.map(m => m.sender_id).filter(Boolean))];
      console.log('🔍 Unique sender IDs:', senderIds);
      
      for (const senderId of senderIds) {
        const { data: person, error: personError } = await supabase
          .from('people')
          .select('id, first_name, last_name, email, role')
          .eq('id', senderId)
          .single();
        
        if (personError) {
          console.log(`❌ Could not find person ${senderId}:`, personError.message);
        } else {
          const personName = person.first_name && person.last_name ? 
                            `${person.first_name} ${person.last_name}` : 
                            'Unknown';
          console.log(`✅ Found person ${senderId}:`, {
            name: personName,
            email: person.email,
            role: person.role,
            firstName: person.first_name,
            lastName: person.last_name
          });
        }
      }
    }
    
    // Test 3: Check if sender_id is being stored correctly
    console.log('\n📋 Test 3: Raw message data structure...');
    const { data: rawMessages, error: rawError } = await supabase
      .from('messages')
      .select('id, sender_id, content, created_at')
      .eq('exchange_id', targetExchangeId)
      .limit(3);
    
    if (rawMessages) {
      console.log('📊 Raw messages:', JSON.stringify(rawMessages, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
};

testMessageSender();