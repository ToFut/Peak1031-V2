require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not configured');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCoordinatorData() {
  try {
    console.log('🔍 Debugging coordinator data...');
    
    const coordinatorId = '12bbeccd-4c85-43ac-8bcf-bfe73fee3525';
    
    // Check if coordinator exists
    const { data: coordinator, error: coordinatorError } = await supabase
      .from('users')
      .select('*')
      .eq('id', coordinatorId)
      .single();
    
    console.log('👤 Coordinator user:', {
      error: coordinatorError?.message,
      user: coordinator ? { id: coordinator.id, email: coordinator.email, role: coordinator.role } : null
    });
    
    // Check exchanges where coordinator is assigned as coordinator
    const { data: coordinatorExchanges, error: coordinatorExchangesError } = await supabase
      .from('exchanges')
      .select('id, name, coordinator_id')
      .eq('coordinator_id', coordinatorId);
    
    console.log('📊 Exchanges where coordinator is assigned:', {
      error: coordinatorExchangesError?.message,
      count: coordinatorExchanges?.length || 0,
      exchanges: coordinatorExchanges?.slice(0, 5)
    });
    
    // Check exchange_participants table
    const { data: participations, error: participationsError } = await supabase
      .from('exchange_participants')
      .select('*')
      .eq('user_id', coordinatorId);
    
    console.log('👥 Exchange participations:', {
      error: participationsError?.message,
      count: participations?.length || 0,
      participations: participations?.slice(0, 5)
    });
    
    // Check all exchanges
    const { data: allExchanges, error: allExchangesError } = await supabase
      .from('exchanges')
      .select('id, name, coordinator_id')
      .limit(10);
    
    console.log('🏢 All exchanges sample:', {
      error: allExchangesError?.message,
      count: allExchanges?.length || 0,
      exchanges: allExchanges?.slice(0, 5)
    });
    
    // Check all exchange_participants
    const { data: allParticipations, error: allParticipationsError } = await supabase
      .from('exchange_participants')
      .select('*')
      .limit(10);
    
    console.log('👥 All exchange participations sample:', {
      error: allParticipationsError?.message,
      count: allParticipations?.length || 0,
      participations: allParticipations?.slice(0, 5)
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugCoordinatorData();
