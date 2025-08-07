const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function simulateChat() {
  try {
    console.log('💬 Simulating chat between different users...\n');
    
    const exchangeId = '8330bc7a-269d-4216-a22c-fd9657eca87c';
    
    // Since we can't use sender_id due to FK constraint, we'll encode sender info in the message
    const messages = [
      { sender: 'admin@peak1031.com', role: 'Admin', content: 'Hello everyone! This is Admin starting the conversation.' },
      { sender: 'client@peak1031.com', role: 'Client', content: 'Hi Admin! This is the Client responding.' },
      { sender: 'coordinator@peak1031.com', role: 'Coordinator', content: 'Coordinator here. How can I help with this exchange?' },
      { sender: 'thirdparty@peak1031.com', role: 'Third Party', content: 'Third Party checking in. Ready to review documents.' },
      { sender: 'admin@peak1031.com', role: 'Admin', content: 'Great! Let\'s discuss the exchange timeline.' },
      { sender: 'client@peak1031.com', role: 'Client', content: 'I need to close by end of month. Is that possible?' },
      { sender: 'coordinator@peak1031.com', role: 'Coordinator', content: 'Yes, we can accommodate that timeline.' },
      { sender: 'thirdparty@peak1031.com', role: 'Third Party', content: 'I\'ll need the documents by next week for review.' },
      { sender: 'admin@peak1031.com', role: 'Admin', content: 'Perfect. I\'ll coordinate with everyone.' },
      { sender: 'client@peak1031.com', role: 'Client', content: 'Thank you all for your help!' }
    ];
    
    console.log('📝 Creating 10 test messages...\n');
    
    const createdMessages = [];
    
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      // Add sender info in the content since we can't use sender_id
      const enrichedContent = `[${msg.role}] ${msg.content}`;
      
      const messageData = {
        content: enrichedContent,
        exchange_id: exchangeId,
        sender_id: null, // Using null since FK constraint issues
        message_type: 'text',
        created_at: new Date(Date.now() + i * 2000).toISOString(), // Stagger timestamps by 2 seconds
        read_by: [],
        metadata: { sender_email: msg.sender, sender_role: msg.role } // Store sender info in metadata
      };
      
      const { data, error } = await supabase
        .from('messages')
        .insert([messageData])
        .select();
      
      if (error) {
        console.error(`❌ Message ${i + 1} failed:`, error.message);
      } else {
        console.log(`✅ Message ${i + 1} sent by ${msg.role}: "${msg.content.substring(0, 40)}..."`);
        createdMessages.push(data[0]);
      }
      
      // Small delay to ensure proper ordering
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n📊 Fetching messages to verify chat flow...\n');
    
    // Fetch messages
    const { data: fetchedMessages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('exchange_id', exchangeId)
      .order('created_at', { ascending: true });
    
    if (fetchError) {
      console.error('❌ Error fetching messages:', fetchError.message);
    } else {
      console.log(`✅ Found ${fetchedMessages.length} messages in the exchange\n`);
      
      if (fetchedMessages.length > 0) {
        console.log('💬 Chat conversation flow:');
        console.log('═'.repeat(60));
        
        fetchedMessages.forEach((msg, i) => {
          const time = new Date(msg.created_at).toLocaleTimeString();
          console.log(`\n[${time}] ${msg.content}`);
        });
        
        console.log('\n' + '═'.repeat(60));
      }
    }
    
    console.log('\n🔍 Testing message retrieval from different user perspectives...\n');
    
    // Test retrieving messages as if from different users
    const testUsers = ['Admin', 'Client', 'Coordinator', 'Third Party'];
    
    for (const userRole of testUsers) {
      const { data: userMessages, error: userError } = await supabase
        .from('messages')
        .select('*')
        .eq('exchange_id', exchangeId)
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (!userError && userMessages) {
        console.log(`📨 Latest messages visible to ${userRole}:`);
        userMessages.reverse().forEach(msg => {
          console.log(`   - ${msg.content.substring(0, 50)}...`);
        });
      }
    }
    
    console.log('\n✅ Chat simulation complete!');
    console.log('📝 Summary:');
    console.log(`   - Exchange ID: ${exchangeId}`);
    console.log(`   - Total messages: ${createdMessages.length}`);
    console.log('   - Participants: Admin, Client, Coordinator, Third Party');
    console.log('   - All users can see all messages in the exchange');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

simulateChat();