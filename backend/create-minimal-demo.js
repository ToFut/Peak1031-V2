require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

async function createMinimalDemo() {
  console.log('🚀 Creating Minimal Working Demo...');
  
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  
  try {
    // Get the SEGEV DEMO exchange
    const { data: segevExchange } = await supabase
      .from('exchanges')
      .select('*')
      .eq('name', 'SEGEV DEMO - Ultimate 1031 Exchange Experience')
      .single();
    
    if (!segevExchange) {
      console.log('❌ SEGEV DEMO exchange not found');
      return;
    }
    
    console.log(`✅ Found SEGEV DEMO: ${segevExchange.id}`);
    
    // Get users for assignments
    const { data: allUsers } = await supabase.from('users').select('*').limit(5);
    const { data: allPeople } = await supabase.from('people').select('*').limit(5);
    
    const assigneeId = allPeople?.[0]?.id || allUsers?.[0]?.id;
    const creatorId = allUsers?.[0]?.id;
    
    // Create absolutely minimal tasks
    console.log('📋 Creating minimal tasks...');
    const minimalTasks = [
      {
        id: uuidv4(),
        title: '🚨 URGENT: Property Selection Deadline (33 Days)',
        description: 'Critical 45-day deadline approaching for property identification',
        exchange_id: segevExchange.id,
        assigned_to: assigneeId,
        created_by: creatorId,
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        due_date: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        title: '💰 Secure $1.8M Financing',
        description: 'Finalize financing for replacement properties',
        exchange_id: segevExchange.id,
        assigned_to: assigneeId,
        created_by: creatorId,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: uuidv4(),
        title: '📄 Upload Appraisal Documents',
        description: 'Upload property appraisals and inspection reports',
        exchange_id: segevExchange.id,
        assigned_to: assigneeId,
        created_by: creatorId,
        status: 'PENDING',
        priority: 'HIGH',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      }
    ];
    
    let taskCount = 0;
    for (const task of minimalTasks) {
      const { error } = await supabase.from('tasks').insert([task]);
      if (error) {
        console.error(`Task error: ${error.message}`);
      } else {
        taskCount++;
        console.log(`✅ Task: ${task.title.substring(0, 50)}...`);
      }
    }
    
    console.log(`\n🎉 Demo Enhanced!`);
    console.log(`📋 Tasks: ${taskCount}/3 created`);
    console.log(`💬 Messages: 20 AI demo messages available`);
    console.log(`🏢 Exchange: SEGEV DEMO ready for testing!`);
    console.log(`\n✨ Next: Navigate to exchange and test document upload!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run
if (require.main === module) {
  createMinimalDemo().catch(console.error);
}

module.exports = createMinimalDemo;