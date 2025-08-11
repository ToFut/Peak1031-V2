require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

async function createDirectMockData() {
  console.log('🎭 Creating direct mock data...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // 1. Get an exchange
    const { data: exchanges, error: exchangeError } = await supabase
      .from('exchanges')
      .select('*')
      .limit(1);
    
    if (exchangeError) {
      console.error('Error fetching exchanges:', exchangeError);
      return;
    }
    
    if (!exchanges || exchanges.length === 0) {
      console.log('❌ No exchanges found');
      return;
    }
    
    const exchange = exchanges[0];
    console.log(`📋 Using exchange: ${exchange.name || exchange.exchange_number || exchange.id}`);
    
    // 2. Get users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    const adminUser = users.find(u => u.role === 'admin') || users[0];
    const coordinatorUser = users.find(u => u.role === 'coordinator') || users[1];
    const clientUser = users.find(u => u.role === 'client') || users[2];
    
    console.log('👥 Users found:', users.map(u => `${u.first_name} ${u.last_name} (${u.role})`));
    
    // 3. Create a minimal document to test the schema
    console.log('📄 Testing document creation...');
    
    const testDoc = {
      id: uuidv4(),
      exchange_id: exchange.id,
      uploaded_by: adminUser?.id,
      created_at: new Date().toISOString()
    };
    
    const { data: docResult, error: docError } = await supabase
      .from('documents')
      .insert([testDoc])
      .select();
    
    if (docError) {
      console.error('Document creation error:', docError);
      
      // Let's try to see what columns exist by trying different field combinations
      console.log('🔍 Trying to understand table structure...');
      
      // Try with just required fields
      const simpleDoc = {
        id: uuidv4()
      };
      
      const { data: simpleResult, error: simpleError } = await supabase
        .from('documents')
        .insert([simpleDoc])
        .select();
        
      console.log('Simple insert result:', { data: simpleResult, error: simpleError });
      
    } else {
      console.log('✅ Document created successfully:', docResult);
      
      // Clean up test document
      await supabase
        .from('documents')
        .delete()
        .eq('id', testDoc.id);
    }
    
    // 4. Try creating tasks
    console.log('📋 Testing task creation...');
    
    const testTask = {
      id: uuidv4(),
      title: 'Test Task',
      exchange_id: exchange.id,
      assigned_to: coordinatorUser?.id || adminUser?.id,
      created_by: adminUser?.id,
      status: 'PENDING',
      created_at: new Date().toISOString()
    };
    
    const { data: taskResult, error: taskError } = await supabase
      .from('tasks')
      .insert([testTask])
      .select();
    
    if (taskError) {
      console.error('Task creation error:', taskError);
    } else {
      console.log('✅ Task created successfully');
      
      // Clean up test task
      await supabase
        .from('tasks')
        .delete()
        .eq('id', testTask.id);
    }
    
    // 5. Try creating messages
    console.log('💬 Testing message creation...');
    
    const testMessage = {
      id: uuidv4(),
      content: 'Test message for schema validation',
      sender_id: adminUser?.id,
      exchange_id: exchange.id,
      created_at: new Date().toISOString()
    };
    
    const { data: messageResult, error: messageError } = await supabase
      .from('messages')
      .insert([testMessage])
      .select();
    
    if (messageError) {
      console.error('Message creation error:', messageError);
    } else {
      console.log('✅ Message created successfully');
      
      // Clean up test message
      await supabase
        .from('messages')
        .delete()
        .eq('id', testMessage.id);
    }
    
    console.log('\n🔍 Schema Investigation Complete');
    console.log('Now I understand what columns are available for creating proper mock data.');
    
  } catch (error) {
    console.error('❌ Error in direct mock data creation:', error);
  }
}

// Run the direct mock data creation
if (require.main === module) {
  createDirectMockData().catch(console.error);
}

module.exports = createDirectMockData;