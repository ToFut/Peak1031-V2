const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addUsersToExchange() {
  try {
    console.log('👥 Adding all @peak1031.com users to exchange as participants...\n');
    
    const exchangeId = '8330bc7a-269d-4216-a22c-fd9657eca87c';
    
    // Define the users to add
    const users = [
      { id: 'd3af6a77-6766-435f-8313-a3be252f269f', email: 'admin@peak1031.com', role: 'admin' },
      { id: '5d8cd54b-9eee-4d76-878b-3694e6665775', email: 'client@peak1031.com', role: 'client' },
      { id: '8f6261ea-8e06-4877-ab5c-95ab9ab6488b', email: 'coordinator@peak1031.com', role: 'coordinator' },
      { id: '8b470c17-9433-45e5-be8e-2b14beb82a70', email: 'thirdparty@peak1031.com', role: 'third_party' }
    ];
    
    // First, check if exchange_participants table exists and what columns it has
    console.log('🔍 Checking exchange_participants table structure...\n');
    
    for (const user of users) {
      // Check if participant already exists
      const { data: existing, error: checkError } = await supabase
        .from('exchange_participants')
        .select('*')
        .eq('exchange_id', exchangeId)
        .eq('user_id', user.id);
      
      if (checkError) {
        console.log(`⚠️  Error checking participant ${user.email}:`, checkError.message);
        continue;
      }
      
      if (existing && existing.length > 0) {
        console.log(`✅ ${user.email} is already a participant`);
        continue;
      }
      
      // Add as participant
      const participantData = {
        exchange_id: exchangeId,
        user_id: user.id,
        role: user.role,
        created_at: new Date().toISOString(),
        is_active: true
      };
      
      const { data, error } = await supabase
        .from('exchange_participants')
        .insert([participantData])
        .select();
      
      if (error) {
        console.error(`❌ Failed to add ${user.email}:`, error.message);
        
        // If the error is about missing columns, try with minimal data
        if (error.message.includes('column')) {
          console.log(`   Retrying with minimal data...`);
          const minimalData = {
            exchange_id: exchangeId,
            user_id: user.id
          };
          
          const { data: retryData, error: retryError } = await supabase
            .from('exchange_participants')
            .insert([minimalData])
            .select();
          
          if (retryError) {
            console.error(`   ❌ Still failed:`, retryError.message);
          } else {
            console.log(`   ✅ Added with minimal data`);
          }
        }
      } else {
        console.log(`✅ Added ${user.email} as ${user.role}`);
      }
    }
    
    console.log('\n📊 Verifying participants in exchange...\n');
    
    // Get all participants
    const { data: participants, error: fetchError } = await supabase
      .from('exchange_participants')
      .select('*')
      .eq('exchange_id', exchangeId);
    
    if (fetchError) {
      console.error('❌ Error fetching participants:', fetchError.message);
    } else {
      console.log(`✅ Total participants in exchange: ${participants.length}`);
      
      if (participants.length > 0) {
        console.log('\n👥 Exchange participants:');
        for (const p of participants) {
          const user = users.find(u => u.id === p.user_id);
          console.log(`   - ${user ? user.email : p.user_id} (${p.role || 'participant'})`);
        }
      }
    }
    
    console.log('\n✅ Setup complete! All users should now have access to the exchange.');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

addUsersToExchange();