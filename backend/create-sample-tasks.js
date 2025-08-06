const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function createSampleTasks() {
  console.log('Creating sample tasks...');
  
  // Get a few exchanges to assign tasks to
  const { data: exchanges } = await supabase
    .from('exchanges')
    .select('id, exchange_name')
    .limit(5);
    
  if (!exchanges || exchanges.length === 0) {
    console.log('No exchanges found');
    return;
  }
  
  const tasks = [
    {
      exchange_id: exchanges[0].id,
      title: 'Review exchange documents',
      description: 'Review and verify all submitted documents for completeness',
      status: 'PENDING',
      priority: 'HIGH',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      exchange_id: exchanges[0].id,
      title: 'Contact client for missing information',
      description: 'Client needs to provide property valuation documents',
      status: 'PENDING',
      priority: 'MEDIUM',
      due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      exchange_id: exchanges[1]?.id || exchanges[0].id,
      title: 'Process 45-day identification',
      description: 'Complete 45-day property identification process',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      due_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      exchange_id: exchanges[2]?.id || exchanges[0].id,
      title: 'Schedule property inspection',
      description: 'Coordinate with buyer for replacement property inspection',
      status: 'PENDING',
      priority: 'LOW',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      exchange_id: exchanges[0].id,
      title: 'Finalize escrow instructions',
      description: 'Review and finalize escrow instructions with all parties',
      status: 'COMPLETED',
      priority: 'HIGH',
      completed_at: new Date().toISOString()
    }
  ];
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(tasks);
    
  if (error) {
    console.log('Error creating tasks:', error);
  } else {
    console.log('✅ Created', tasks.length, 'sample tasks');
  }
  
  // Check the counts
  const { count: totalCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true });
  
  const { count: pendingCount } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING');
    
  console.log('📊 Total tasks:', totalCount);
  console.log('⏳ Pending tasks:', pendingCount);
}

createSampleTasks();