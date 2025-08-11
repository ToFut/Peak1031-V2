require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');

async function createSimpleSegevDemo() {
  console.log('🚀 Creating Simple SEGEV DEMO...');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    // Get existing users and contacts
    const { data: allUsers } = await supabase.from('users').select('*').limit(10);
    const { data: allContacts } = await supabase.from('contacts').select('*').limit(10);
    const { data: allPeople } = await supabase.from('people').select('*').limit(10);
    
    console.log(`Found ${allUsers?.length || 0} users, ${allContacts?.length || 0} contacts, ${allPeople?.length || 0} people`);
    
    // Find existing SEGEV DEMO exchange
    const { data: existingExchange } = await supabase
      .from('exchanges')
      .select('*')
      .eq('name', 'SEGEV DEMO - Ultimate 1031 Exchange Experience')
      .single();
    
    if (!existingExchange) {
      console.log('❌ SEGEV DEMO exchange not found');
      return;
    }
    
    const exchangeId = existingExchange.id;
    console.log(`✅ Found SEGEV DEMO exchange: ${exchangeId}`);
    
    // Create simple tasks (using minimal required fields)
    console.log('📋 Creating tasks...');
    const simpleTasks = [
      {
        id: uuidv4(),
        title: '🚨 URGENT: Submit Final Property Selection (33 Days Left)',
        description: 'CRITICAL: Must finalize property selection before 45-day deadline expires.',
        exchange_id: exchangeId,
        assigned_to: allPeople?.[0]?.id || allUsers?.[0]?.id,
        created_by: allUsers?.[0]?.id,
        status: 'IN_PROGRESS',
        priority: 'URGENT',
        due_date: new Date(Date.now() + 33 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'compliance'
      },
      {
        id: uuidv4(),
        title: '📄 Upload Property Appraisals & Inspections',
        description: 'Upload professional appraisal reports and inspection documentation.',
        exchange_id: exchangeId,
        assigned_to: allPeople?.[0]?.id || allUsers?.[0]?.id,
        created_by: allUsers?.[0]?.id,
        status: 'PENDING',
        priority: 'HIGH',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'documents'
      },
      {
        id: uuidv4(),
        title: '💰 Secure Financing ($1.8M)',
        description: 'Finalize financing arrangements for replacement properties.',
        exchange_id: exchangeId,
        assigned_to: allPeople?.[0]?.id || allUsers?.[0]?.id,
        created_by: allUsers?.[0]?.id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
        category: 'financial'
      }
    ];
    
    let taskCount = 0;
    for (const task of simpleTasks) {
      const { error } = await supabase.from('tasks').insert([task]);
      if (error) {
        console.error(`Task error: ${error.message}`);
      } else {
        taskCount++;
        console.log(`✅ Created: ${task.title}`);
      }
    }
    
    // Create simple exchange participants (using minimal fields)
    console.log('👥 Creating participants...');
    if (allUsers?.length >= 3) {
      const simpleParticipants = [
        {
          id: uuidv4(),
          exchange_id: exchangeId,
          user_id: allUsers[0].id,
          role: 'admin',
          permissions: 'full_access'
        },
        {
          id: uuidv4(),
          exchange_id: exchangeId,
          user_id: allUsers[1].id,
          role: 'coordinator', 
          permissions: 'edit'
        },
        {
          id: uuidv4(),
          exchange_id: exchangeId,
          user_id: allUsers[2].id,
          role: 'client',
          permissions: 'view'
        }
      ];
      
      let participantCount = 0;
      for (const participant of simpleParticipants) {
        const { error } = await supabase.from('exchange_participants').insert([participant]);
        if (error) {
          console.error(`Participant error: ${error.message}`);
        } else {
          participantCount++;
        }
      }
      
      console.log(`✅ Created ${participantCount} participants`);
    }
    
    console.log(`\n🎉 SEGEV DEMO Enhanced!`);
    console.log(`📋 Tasks: ${taskCount} created`);
    console.log(`💬 Messages: Already have 20 AI demo messages`);
    console.log(`🏢 Exchange: Ready for ultimate demo experience!`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the simple SEGEV DEMO enhancement
if (require.main === module) {
  createSimpleSegevDemo().catch(console.error);
}

module.exports = createSimpleSegevDemo;