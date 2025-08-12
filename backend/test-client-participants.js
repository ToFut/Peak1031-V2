require('dotenv').config();
const supabaseService = require('./services/supabase');

async function testClientExchangeAccess() {
  try {
    console.log('🧪 Testing client exchange access and participants...\n');
    
    // Get client user
    const { data: clientUser } = await supabaseService.client
      .from('users')
      .select('*')
      .eq('email', 'client@peak1031.com')
      .single();
    
    if (!clientUser) {
      console.log('❌ Client user not found');
      return;
    }
    
    console.log('✅ Client user:', clientUser.email, 'contact_id:', clientUser.contact_id);
    
    // Get client's exchanges using RBAC
    const rbacService = require('./services/rbacService');
    const { data: exchanges } = await rbacService.getExchangesForUser(clientUser);
    console.log('📋 Client has access to', exchanges.length, 'exchanges');
    
    if (exchanges.length > 0) {
      const firstExchange = exchanges[0];
      console.log('\n🔍 Testing first exchange:', firstExchange.name || firstExchange.title);
      console.log('   Exchange ID:', firstExchange.id);
      
      // Test participants endpoint manually
      const { data: participants, error } = await supabaseService.client
        .from('exchange_participants')
        .select('*')
        .eq('exchange_id', firstExchange.id);
      
      if (error) {
        console.log('❌ Error fetching participants:', error);
      } else {
        console.log('✅ Found', participants.length, 'participants for this exchange:');
        participants.forEach((p, i) => {
          console.log('   ' + (i+1) + '. Role:', p.role, 'Contact ID:', p.contact_id, 'Active:', p.is_active);
        });
      }
      
      // Test the HTTP endpoint
      console.log('\n🌐 Testing HTTP endpoint...');
      const fetch = await import('node-fetch');
      const response = await fetch.default(`http://localhost:5001/api/exchanges/${firstExchange.id}/participants`);
      const result = await response.json();
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(result, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testClientExchangeAccess();